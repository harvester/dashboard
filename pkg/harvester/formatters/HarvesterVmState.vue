<script>
import VMState from '@shell/components/formatter/BadgeStateFormatter';
import HarvesterMigrationState from './HarvesterMigrationState';

export default {
  components: { VMState, HarvesterMigrationState },
  props:      {
    value: {
      type:    String,
      default: ''
    },

    row: {
      type:     Object,
      required: true
    },

    allNodeNetwork: {
      type:    Array,
      default: () => {
        return [];
      }
    },

    allClusterNetwork: {
      type:    Array,
      default: () => {
        return [];
      }
    }
  },

  data() {
    return {
      isMigrating: false,
      timer:       null,
    };
  },

  beforeDestroy() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
  },

  computed: {
    warningMessage() {
      const out = [];

      if (this.row?.actualState === 'VM error' && this.row.warningMessage?.message) {
        out.push(this.row.warningMessage?.message);
      }

      if (this.row?.migrationMessage) {
        out.push(this.row?.migrationMessage.message);
      }

      if (this.row.warningMessage?.message) {
        if (this.row.warningMessage?.pod) {
          const pod = this.row.warningMessage.pod;

          if (pod.metadata?.state?.error && !/pod has unbound immediate PersistentVolumeClaims/.test(pod.metadata?.state?.message)) {
            out.push(pod.metadata?.state?.message);
          }
        } else {
          out.push(this.row.warningMessage?.message);
        }
      }

      return out;
    }
  },

  methods: {
    migrationStateChanged(neu) {
      if (neu === 'Failed') {
        this.isMigrating = false;
      } else {
        this.isMigrating = !!neu;
      }
    },

    showMessage(show) {
      if (this.timer) {
        clearTimeout(this.timer);
      }

      if (this.$refs.popover) {
        if (show) {
          this.$refs.popover.show();
        } else {
          this.$refs.popover.hide();
        }
      }
    },

    delayClose() {
      this.timer = setTimeout(() => {
        this.showMessage(false);
      }, 500);
    },

    async dismiss() {
      try {
        await this.row.doAction('dismissInsufficientResourceQuota');
      } catch (err) {
        if (err?._status === 400 || err?._status === 503) {
          this.$store.dispatch('growl/error', {
            title:   this.t('harvester.notification.title.error'),
            message: err?.errors[0]
          }, { root: true });
        }
      }
    },

    canMiss(row, message) {
      return row.warningMessage?.message === message && row.warningMessage?.canDismiss;
    }
  },
};
</script>

<template>
  <span>
    <HarvesterMigrationState v-show="isMigrating" :vm-resource="row" @state-changed="migrationStateChanged" />
    <div v-show="!isMigrating" class="state">
      <VMState :row="row" />
      <v-popover
        v-if="warningMessage.length"
        ref="popover"
        trigger="manual"
        offset="16"
      >
        <span
          class="tooltip-target"
          @mouseenter="showMessage(true)"
          @mouseleave="delayClose()"
        >
          <i class="icon icon-warning icon-lg text-warning" />
        </span>

        <template slot="popover">
          <div
            @mouseenter="showMessage(true)"
            @mouseleave="showMessage(false)"
          >
            <p v-for="(message, index) in warningMessage" :key="message">
              {{ index + 1 }}.
              <a
                v-if="canMiss(row, message)"
                class="text-link"
                role="button"
                @click="dismiss"
              >
                {{ t('harvester.upgradePage.dismissMessage') }}
              </a>
              {{ message }}
            </p>
          </div>
        </template>
      </v-popover>
    </div>
  </span>
</template>

<style lang="scss" scoped>
.state {
  display: flex;
  justify-content: space-between;

  .icon-warning {
    margin-top: 2px;
  }
}
</style>
