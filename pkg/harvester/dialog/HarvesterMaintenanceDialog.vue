<script>
import { mapGetters } from 'vuex';
import AsyncButton from '@shell/components/AsyncButton';
import { Card } from '@components/Card';
import { Banner } from '@components/Banner';
import { Checkbox } from '@components/Form/Checkbox';
import { exceptionToErrorsArray } from '@shell/utils/error';
import { BadgeState } from '@components/BadgeState';

export default {
  components: {
    Card,
    Checkbox,
    AsyncButton,
    Banner,
    BadgeState
  },

  props: {
    resources: {
      type:     Array,
      required: true
    }
  },

  data() {
    return {
      errors:      [],
      unhealthyVM: '',
      force:       false
    };
  },

  computed: {
    ...mapGetters({ t: 'i18n/t' }),

    actionResource() {
      return this.resources[0];
    },
  },

  methods: {
    close() {
      this.$emit('close');
    },

    async apply(buttonCb) {
      this.errors = [];
      this.unhealthyVM = '';

      try {
        const res = await this.actionResource.doAction('maintenancePossible');

        if (this.force) {
          if (res._status === 200 || res._status === 204) {
            await this.actionResource.doAction('enableMaintenanceMode', { force: 'true' });
            buttonCb(true);
            this.close();
          } else {
            buttonCb(false);
          }
        } else if (res._status === 200 || res._status === 204) {
          const res = await this.actionResource.doAction('listUnhealthyVM');

          if (res.message) {
            this.unhealthyVM = res;
            buttonCb(false);
          } else {
            await this.actionResource.doAction('enableMaintenanceMode', { force: 'false' });
            buttonCb(true);
            this.close();
          }
        } else {
          buttonCb(false);
        }
      } catch (e) {
        const error = [e?.data] || exceptionToErrorsArray(e);

        this.errors = error;
        buttonCb(false);
      }
    }
  }
};
</script>

<template>
  <Card :show-highlight-border="false">
    <template #title>
      {{ t('harvester.host.enableMaintenance.title') }}
    </template>

    <template #body>
      <div>
        <Checkbox
          v-model="force"
          label-key="harvester.host.enableMaintenance.force"
        />
      </div>
      <Banner color="warning" :label="t('harvester.host.enableMaintenance.protip')" class="mb-0" />
      <Banner v-for="(err, i) in errors" :key="i" color="error" :label="err" />

      <div v-if="unhealthyVM">
        <Banner color="error mb-5">
          <p>
            {{ unhealthyVM.message }}
          </p>
        </Banner>

        <div class="vm-list mb-5">
          <BadgeState
            v-for="vm in unhealthyVM.vms"
            :key="vm"
            color="bg-error mb-5 mr-5"
            :label="vm"
          />
        </div>
      </div>
    </template>

    <div slot="actions" class="actions">
      <div class="buttons">
        <button class="btn role-secondary mr-10" @click="close">
          {{ t('generic.cancel') }}
        </button>

        <AsyncButton
          mode="apply"
          @click="apply"
        />
      </div>
    </div>
  </Card>
</template>

<style lang="scss" scoped>
.actions {
  width: 100%;
}

.vm-list {
  display: flex;
  flex-wrap: wrap;
}

.buttons {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}
</style>
