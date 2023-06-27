<script>
import merge from 'lodash/merge';
import jsyaml from 'js-yaml';
import { LabeledInput } from '@components/Form/LabeledInput';
import CreateEditView from '@shell/mixins/create-edit-view';
import { RadioGroup } from '@components/Form/Radio';

const DEFAUL_VALUE = {
  hostname:          '',
  rancherVersion:    '',
  bootstrapPassword: '',
};

export default {
  name:       'EditAddonVcluster',
  components: { LabeledInput, RadioGroup },

  mixins: [CreateEditView],

  props: {
    value: {
      type:     Object,
      required: true,
    },

    mode: {
      type:     String,
      required: true
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
            :required="true"
            :mode="mode"
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
