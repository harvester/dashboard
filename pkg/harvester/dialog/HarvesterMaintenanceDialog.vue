<script>
import { mapGetters } from 'vuex';
import AsyncButton from '@shell/components/AsyncButton';
import { Card } from '@components/Card';
import { Banner } from '@components/Banner';
import { Checkbox } from '@components/Form/Checkbox';
import { exceptionToErrorsArray } from '@shell/utils/error';
import { BadgeState } from '@components/BadgeState';
import { ucFirst } from '@shell/utils/string';

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
      errors:       [],
      unhealthyVMs: [],
      force:        false
    };
  },

  computed: {
    ...mapGetters({ t: 'i18n/t' }),

    actionResource() {
      return this.resources[0];
    },
  },

  methods: {
    ucFirst,

    onInputForce(v) {
      if (v) {
        this.unhealthyVMs = [];
      }
    },

    close() {
      this.$emit('close');
    },

    async apply(buttonCb) {
      this.errors = [];
      this.unhealthyVMs = [];

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

          if (res?.length) {
            this.unhealthyVMs = res;
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
          @input="onInputForce"
        />
      </div>

      <Banner color="warning" :label="t('harvester.host.enableMaintenance.protip')" />

      <Banner v-for="(err, i) in errors" :key="i" color="error" :label="ucFirst(err)" />

      <Banner v-if="!force" class="mt-0" color="warning" :labelKey="'harvester.host.enableMaintenance.shutDownVMs'" />

      <div v-for="(unhealthyVM, i) in unhealthyVMs" :key="i">
        <Banner color="error mt-0 mb-5">
          <p>
            {{ ucFirst(unhealthyVM.message) }}
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
