<script>
import merge from 'lodash/merge';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import { RadioGroup } from '@components/Form/Radio';
import { LabeledInput } from '@components/Form/LabeledInput';
import CreateEditView from '@shell/mixins/create-edit-view';
import jsyaml from 'js-yaml';

const DEFAUL_VALUE = {
  fluentbit: {
    resources: {
      limits: {
        cpu:    '200m',
        memory: '200Mi'
      },
      requests: {
        cpu:    '50m',
        memory: '50Mi'
      }
    }
  },
  fluentd: {
    resources: {
      limits: {
        cpu:    '1000m',
        memory: '800Mi'
      },
      requests: {
        cpu:    '100m',
        memory: '20Mi'
      }
    }
  },
};

export default {
  name:       'EditAddonLogging',
  components: {
    Tabbed,
    Tab,
    RadioGroup,
    LabeledInput,
  },

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
    let valuesContentJson = DEFAUL_VALUE;

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
  <Tabbed :side-tabs="true">
    <Tab
      name="basic"
      :label="t('harvester.addons.vmImport.titles.basic')"
      :weight="99"
    >
      <RadioGroup
        v-model="value.spec.enabled"
        class="mb-20"
        name="model"
        :mode="mode"
        :options="[true,false]"
        :labels="[t('generic.enabled'), t('generic.disabled')]"
      />
    </Tab>
    <Tab v-if="value.spec.enabled" name="fluentbit" :label="t('harvester.logging.configuration.section.fluentbit')" :weight="-1">
      <div class="row mt-20">
        <div class="col span-6">
          <LabeledInput
            v-model="valuesContentJson.fluentbit.resources.requests.cpu"
            :label="t('monitoring.prometheus.config.requests.cpu')"
            :required="true"
            :mode="mode"
          />
        </div>
        <div class="col span-6">
          <LabeledInput
            v-model="valuesContentJson.fluentbit.resources.requests.memory"
            :label="t('monitoring.prometheus.config.requests.memory')"
            :required="true"
            :mode="mode"
          />
        </div>
      </div>
      <div class="row mt-20">
        <div class="col span-6">
          <LabeledInput
            v-model="valuesContentJson.fluentbit.resources.limits.cpu"
            :label="t('monitoring.prometheus.config.limits.cpu')"
            :required="true"
            :mode="mode"
          />
        </div>
        <div class="col span-6">
          <LabeledInput
            v-model="valuesContentJson.fluentbit.resources.limits.memory"
            :label="t('monitoring.prometheus.config.limits.memory')"
            :required="true"
            :mode="mode"
          />
        </div>
      </div>
    </Tab>
    <Tab v-if="value.spec.enabled" name="fluentd" :label="t('harvester.logging.configuration.section.fluentd')" :weight="-1">
      <div class="row mt-20">
        <div class="col span-6">
          <LabeledInput
            v-model="valuesContentJson.fluentd.resources.requests.cpu"
            :label="t('monitoring.prometheus.config.requests.cpu')"
            :required="true"
            :mode="mode"
          />
        </div>
        <div class="col span-6">
          <LabeledInput
            v-model="valuesContentJson.fluentd.resources.requests.memory"
            :label="t('monitoring.prometheus.config.requests.memory')"
            :required="true"
            :mode="mode"
          />
        </div>
      </div>
      <div class="row mt-20">
        <div class="col span-6">
          <LabeledInput
            v-model="valuesContentJson.fluentd.resources.limits.cpu"
            :label="t('monitoring.prometheus.config.limits.cpu')"
            :required="true"
            :mode="mode"
          />
        </div>
        <div class="col span-6">
          <LabeledInput
            v-model="valuesContentJson.fluentd.resources.limits.memory"
            :label="t('monitoring.prometheus.config.limits.memory')"
            :required="true"
            :mode="mode"
          />
        </div>
      </div>
    </Tab>
  </Tabbed>
</template>

<style lang="scss" scoped>
  ::v-deep .radio-group {
    display: flex;
    .radio-container {
      margin-right: 30px;
    }
  }
</style>
