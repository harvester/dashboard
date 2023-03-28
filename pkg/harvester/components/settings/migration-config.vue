<script>
import { _EDIT } from '@shell/config/query-params';
import { LabeledInput } from '@components/Form/LabeledInput';
import UnitInput from '@shell/components/form/UnitInput';
import Tip from '@shell/components/Tip';
import { pickBy } from 'lodash';

export default {
  name: 'HarvesterSupportBundleImage',

  components: {
    LabeledInput,
    UnitInput,
    Tip,
  },

  props: {
    registerBeforeHook: {
      type:     Function,
      required: true,
    },

    mode: {
      type:    String,
      default: _EDIT,
    },

    value: {
      type:    Object,
      default: () => {
        return {};
      },
    },
  },

  data() {
    let parseDefaultValue = {};

    try {
      parseDefaultValue = JSON.parse(this.value.value);
    } catch (error) {
      parseDefaultValue = JSON.parse(this.value.default || '{}');
    }

    return { parseDefaultValue };
  },

  created() {
    this.update();
    if (this.registerBeforeHook) {
      this.registerBeforeHook(this.willSave, 'willSave');
    }
  },

  methods: {
    update() {
      const parseDefaultValue = pickBy(this.parseDefaultValue, (value) => {
        return !!value;
      });

      const value = JSON.stringify(parseDefaultValue);

      this.$set(this.value, 'value', value);
    },

    willSave() {
      const errors = [];

      if (errors.length > 0) {
        return Promise.reject(errors);
      } else {
        return Promise.resolve();
      }
    },
  },

  watch: {
    value: {
      handler(neu) {
        const parseDefaultValue = JSON.parse(neu.value || '{}');

        this.$set(this, 'parseDefaultValue', parseDefaultValue);
      },
      deep: true
    }
  }
};
</script>

<template>
  <div>
    <div class="row">
      <div class="col span-12">
        <LabeledInput
          v-model.number="parseDefaultValue.parallelMigrationsPerCluster"
          v-int-number
          :mode="mode"
          label-key="harvester.setting.migrationConfig.parallelMigrationsPerCluster.label"
          @input="update"
        />
        <Tip
          class="mt-10"
          icon="icon icon-info"
          :text="t('harvester.setting.migrationConfig.parallelMigrationsPerCluster.tip')"
        />
      </div>
    </div>
    <div class="row mt-20">
      <div class="col span-12">
        <LabeledInput
          v-model.number="parseDefaultValue.parallelOutboundMigrationsPerNode"
          v-int-number
          :mode="mode"
          label-key="harvester.setting.migrationConfig.parallelOutboundMigrationsPerNode.label"
          @input="update"
        />
        <Tip
          class="mt-10"
          icon="icon icon-info"
          :text="t('harvester.setting.migrationConfig.parallelOutboundMigrationsPerNode.tip')"
        />
      </div>
    </div>
    <div class="row mt-20">
      <div class="col span-12">
        <UnitInput
          v-model="parseDefaultValue.bandwidthPerMigration"
          v-int-number
          :mode="mode"
          label-key="harvester.setting.migrationConfig.bandwidthPerMigration.label"
          :input-exponent="2"
          :increment="1024"
          :output-modifier="true"
          @input="update"
        />
        <Tip
          class="mt-10"
          icon="icon icon-info"
          :text="t('harvester.setting.migrationConfig.bandwidthPerMigration.tip')"
        />
      </div>
    </div>
    <div class="row mt-20">
      <div class="col span-12">
        <LabeledInput
          v-model.number="parseDefaultValue.completionTimeoutPerGiB"
          v-int-number
          :mode="mode"
          label-key="harvester.setting.migrationConfig.completionTimeoutPerGiB.label"
          @input="update"
        />
        <Tip
          class="mt-10"
          icon="icon icon-info"
          :text="t('harvester.setting.migrationConfig.completionTimeoutPerGiB.tip')"
        />
      </div>
    </div>
    <div class="row mt-20">
      <div class="col span-12">
        <LabeledInput
          v-model.number="parseDefaultValue.progressTimeout"
          v-int-number
          :mode="mode"
          label-key="harvester.setting.migrationConfig.progressTimeout.label"
          @input="update"
        />
        <Tip
          class="mt-10"
          icon="icon icon-info"
          :text="t('harvester.setting.migrationConfig.progressTimeout.tip')"
        />
      </div>
    </div>
  </div>
</template>
