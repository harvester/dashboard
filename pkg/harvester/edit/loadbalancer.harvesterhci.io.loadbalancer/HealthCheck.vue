<script>
import { LabeledInput } from '@components/Form/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import RadioGroup from '@components/Form/Radio/RadioGroup';

export default {
  components: {
    LabeledInput,
    LabeledSelect,
    RadioGroup,
  },

  props: {
    value: {
      type:     Object,
      required: true,
    },

    model: {
      type:     Object,
      required: true,
    },

    mode: {
      type:    String,
      default: 'create'
    },

    disabled: {
      type:    Boolean,
      default: false,
    },
  },

  data() {
    return { healthCheckEnabled: !!this.value.port };
  },

  computed: {
    portOptions() {
      const ports = this.model?.spec?.listeners || [];

      return ports.filter(p => p.port && p.protocol === 'TCP').map(p => p.port) || [];
    },
  },
};
</script>

<template>
  <div>
    <div class="row">
      <div class="col span-6">
        <RadioGroup
          v-model="healthCheckEnabled"
          :mode="mode"
          name="healthCheckEnabled"
          :labels="[t('generic.disabled'),t('generic.enabled')]"
          :options="[false, true]"
          :disabled="disabled"
        />
      </div>
    </div>
    <div v-if="healthCheckEnabled">
      <div class="row mt-10">
        <div v-if="healthCheckEnabled" class="col span-6">
          <LabeledSelect
            v-model="value.port"
            :mode="mode"
            :options="portOptions"
            required
            :label="t('harvester.service.healthCheckPort.label')"
            :disabled="disabled"
          />
        </div>
        <div class="col span-6">
          <LabeledInput
            v-model.number="value.successThreshold"
            :mode="mode"
            type="number"
            :label="t('harvester.service.healthCheckSuccessThreshold.label')"
            :tooltip="t('harvester.service.healthCheckSuccessThreshold.description')"
            :disabled="disabled"
          />
        </div>
      </div>
      <div class="row mt-10">
        <div class="col span-6">
          <LabeledInput
            v-model.number="value.failureThreshold"
            :mode="mode"
            type="number"
            :label="t('harvester.service.healthCheckFailureThreshold.label')"
            :tooltip="t('harvester.service.healthCheckFailureThreshold.description')"
            :disabled="disabled"
          />
        </div>
        <div class="col span-6">
          <LabeledInput
            v-model.number="value.periodSeconds"
            :mode="mode"
            type="number"
            :label="t('harvester.service.healthCheckPeriod.label')"
            :disabled="disabled"
          />
        </div>
      </div>
      <div class="row mt-10">
        <div class="col span-6">
          <LabeledInput
            v-model.number="value.timeoutSeconds"
            :mode="mode"
            type="number"
            :label="t('harvester.service.healthCheckTimeout.label')"
            :disabled="disabled"
          />
        </div>
      </div>
    </div>
  </div>
</template>
