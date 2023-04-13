<script>
import { mapGetters } from 'vuex';
import { exceptionToErrorsArray } from '@shell/utils/error';

import { sortBy } from '@shell/utils/sort';
import { Card } from '@components/Card';
import { Banner } from '@components/Banner';
import AsyncButton from '@shell/components/AsyncButton';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { NAMESPACE, STORAGE_CLASS } from '@shell/config/types';
import { allHash } from '@shell/utils/promise';

export default {
  name: 'HarvesterPowerDialog',

  components: {
    AsyncButton,
    Banner,
    Card,
    LabeledSelect,
  },

  props: {
    resources: {
      type:     Array,
      required: true
    }
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;

    const hash = { storages: this.$store.dispatch(`${ inStore }/findAll`, { type: STORAGE_CLASS }) };

    await allHash(hash);

    const defaultStorage = this.$store.getters[`${ inStore }/all`](STORAGE_CLASS).find(s => s.isDefault);

    this.$set(this, 'storageClassName', defaultStorage?.metadata?.name || 'longhorn');
  },

  data() {
    const namespace = this.$store.getters['defaultNamespace'] || '';

    return {
      name:             '',
      namespace,
      storageClassName: '',
      errors:           [],
      action:           '',
    };
  },

  computed: {
    ...mapGetters({ t: 'i18n/t' }),

    actionResource() {
      return this.resources[0];
    },

    namespaces() {
      const choices = this.$store.getters['harvester/all'](NAMESPACE).filter( N => !N.isSystem);

      const out = sortBy(
        choices.map((obj) => {
          return {
            label: obj.nameDisplay,
            value: obj.id,
          };
        }),
        'label'
      );

      return out;
    },

    actions() {
      return [
        {
          label: this.t('harvester.modal.powerAction.shutdown'),
          value: 'shutdown',
        },
        {
          label: this.t('harvester.modal.powerAction.poweron'),
          value: 'poweron',
        },
        {
          label: this.t('harvester.modal.powerAction.reboot'),
          value: 'reboot',
        },
      ];
    },

    storageClassOptions() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const storages = this.$store.getters[`${ inStore }/all`](STORAGE_CLASS);

      const out = storages.filter(s => !s.parameters?.backingImage).map((s) => {
        const label = s.isDefault ? `${ s.name } (${ this.t('generic.default') })` : s.name;

        return {
          label,
          value: s.name,
        };
      }) || [];

      return out;
    },
  },

  methods: {
    close() {
      this.name = '';
      this.namespace = '';
      this.storageClassName = '';
      this.$emit('close');
    },

    async save(buttonCb) {
      try {
        const res = await this.actionResource.doAction('powerAction', { operation: this.action });

        if (res._status === 200 || res._status === 204) {
          this.$store.dispatch('growl/success', {
            title:   this.t('generic.notification.title.succeed'),
            message: this.t('harvester.modal.exportImage.message.success', { name: this.name })
          }, { root: true });

          this.close();
          buttonCb(true);
        } else {
          const error = [res?.data] || exceptionToErrorsArray(res);

          this.$set(this, 'errors', error);
          buttonCb(false);
        }
      } catch (err) {
        const error = err?.data || err;
        const message = exceptionToErrorsArray(error);

        this.$set(this, 'errors', message);
        buttonCb(false);
      }
    }
  },
};
</script>

<template>
  <Card :show-highlight-border="false">
    <template #title>
      {{ t('harvester.modal.powerAction.title') }}
    </template>

    <template #body>
      <LabeledSelect
        v-model="action"
        :label="t('harvester.modal.exportImage.namespace')"
        :options="actions"
        class="mb-20"
        required
      />
    </template>

    <div slot="actions" class="actions">
      <div class="buttons">
        <button class="btn role-secondary mr-10" @click="close">
          {{ t('generic.cancel') }}
        </button>

        <AsyncButton
          mode="create"
          @click="save"
        />
      </div>

      <Banner v-for="(err, i) in errors" :key="i" color="error" :label="err" />
    </div>
  </Card>
</template>

<style lang="scss" scoped>
.actions {
  width: 100%;
}

.buttons {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}
</style>
