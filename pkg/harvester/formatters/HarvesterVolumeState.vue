<script>
import ProgressBarMulti from '@shell/components/ProgressBarMulti';
import { HCI as HCI_ANNOTATIONS } from '@pkg/harvester/config/labels-annotations';
import VolumeState from '@shell/components/formatter/BadgeStateFormatter';

export default {
  components: { VolumeState, ProgressBarMulti },
  props:      {
    row: {
      type:     Object,
      required: true
    },
  },

  computed: {
    warningMessage() {
      return this.row.relatedPV?.metadata?.annotations?.[HCI_ANNOTATIONS.VOLUME_ERROR];
    },

    rebuildStatus() {
      return this.row.longhornEngine?.status?.rebuildStatus;
    },

    isRebuilding() {
      return this.rebuildStatus && Object.keys(this.rebuildStatus).length > 0;
    },

    percentage() {
      if (!this.isRebuilding) {
        return;
      }

      const rebuildStatus = Object.values(this.rebuildStatus)?.[0];
      const value = rebuildStatus?.progress;

      return [{
        value,
        color: 'bg-warning'
      }];
    },

    rebuildingMessage() {
      return this.$store.getters['i18n/t']('harvester.volume.rebuildingMessage', { percentage: this.percentage[0].value });
    }
  },
};
</script>

<template>
  <span>
    <div>
      <ProgressBarMulti
        v-if="isRebuilding"
        v-clean-tooltip="rebuildingMessage"
        :values="percentage"
        :min="0"
        :max="100"
        class="mb-10"
      />
    </div>
    <div class="state">
      <VolumeState :row="row" />
      <v-popover
        v-if="!!warningMessage"
        trigger="hover"
        offset="16"
      >
        <span class="tooltip-target">
          <i class="icon icon-warning icon-lg text-warning" />
        </span>

        <template slot="popover">
          <p class="warning-message">
            {{ warningMessage }}
          </p>
        </template>
      </v-popover>
    </div>
  </span>
</template>

<style lang="scss" scoped>
.state {
  display: flex;

  .icon-warning {
    margin-top: 2px;
  }
}
.warning-message:first-letter {
  text-transform: uppercase;
}

</style>
