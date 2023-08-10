<script>
import merge from 'lodash/merge';
import jsyaml from 'js-yaml';
import { LabeledInput } from '@components/Form/LabeledInput';
import { RadioGroup } from '@components/Form/Radio';

const DEFAUL_VALUE = {
  hostname:          '',
  rancherVersion:    '',
  bootstrapPassword: '',
};

export default {
  name:       'EditAddonVcluster',
  components: { LabeledInput, RadioGroup },

  props: {
    value: {
      type:     Object,
      required: true,
    },

    mode: {
      type:     String,
      required: true
    },
    registerBeforeHook: {
      type:     Function,
      required: true,
    },
  },

  data() {
    let valuesContentJson = {};

    try {
      valuesContentJson = merge({}, DEFAUL_VALUE, jsyaml.load(this.value.spec.valuesContent));
    } catch (err) {
      valuesContentJson = DEFAUL_VALUE;

      this.$store.dispatch('growl/fromError', {
        title: this.$store.getters['i18n/t']('generic.notification.title.error'),
        err:   err.data || err,
      }, { root: true });
    }

    return { valuesContentJson };
  },

  created() {
    if (this.registerBeforeHook) {
      this.registerBeforeHook(this.willSave, 'willSave');
    }
  },

  methods: {
    willSave() {
      const errors = [];

      if (!this.value.spec.enabled) {
        return Promise.resolve();
      }

      if (!this.valuesContentJson.hostname) {
        errors.push(this.t('validation.required', { key: this.t('harvester.addons.rancherVcluster.hostname') }, true));
      }

      if (!this.valuesContentJson.bootstrapPassword) {
        errors.push(this.t('validation.required', { key: this.t('harvester.addons.rancherVcluster.password') }, true));
      }

      if (errors.length > 0) {
        return Promise.reject(errors);
      } else {
        return Promise.resolve();
      }
    },
  },

  watch: {
    valuesContentJson: {
      handler(neu) {
        this.$set(this.value.spec, 'valuesContent', jsyaml.dump(neu));
      },
      deep:      true,
      immediate: true
    },
  },
};
</script>

<template>
  <div>
    <div class="row">
      <div class="col span-12">
        <RadioGroup
          v-model="value.spec.enabled"
          class="mb-20"
          name="model"
          :mode="mode"
          :options="[true,false]"
          :labels="[t('generic.enabled'), t('generic.disabled')]"
        />
      </div>
    </div>

    <template v-if="value.spec.enabled">
      <div class="row mb-20">
        <div class="col span-6">
          <LabeledInput
            v-model="valuesContentJson.hostname"
            label-key="harvester.addons.rancherVcluster.hostname"
            :required="true"
            :mode="mode"
            placeholder="rancher.$vip.nip.io"
          />
        </div>

        <div class="col span-6">
          <LabeledInput
            v-model="valuesContentJson.rancherVersion"
            label-key="harvester.addons.rancherVcluster.rancherVersion"
            :required="true"
            :disabled="true"
          />
        </div>
      </div>

      <div class="row mt-20">
        <div class="col span-6">
          <LabeledInput
            v-model="valuesContentJson.bootstrapPassword"
            label-key="harvester.addons.rancherVcluster.password"
            :mode="mode"
            :required="true"
            type="password"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
  ::v-deep .radio-group {
    display: flex;
    .radio-container {
      margin-right: 30px;
    }
  }
</style>
