<script>
import Select from '@shell/components/form/Select';
import UnitInput from '@shell/components/form/UnitInput';
import PercentageBar from '@shell/components/PercentageBar';
import { formatSi, parseSi } from '@shell/utils/units';
import { ROW_COMPUTED } from '@shell/components/form/ResourceQuota/shared';

const DEFAULT_MAINTENANCE = 30;

export default {
  components: {
    Select, PercentageBar, UnitInput
  },

  props: {
    mode: {
      type:     String,
      required: true,
    },
    types: {
      type:    Array,
      default: () => []
    },
    type: {
      type:     String,
      required: true
    },
    value: {
      type:    Object,
      default: () => {
        return {};
      }
    },
    namespace: {
      type:    Object,
      default: () => {
        return {};
      }
    },
    projectResourceQuotaLimits: {
      type:    Object,
      default: () => {
        return {};
      }
    },
    namespaceResourceQuotaLimits: {
      type:    Array,
      default: () => {
        return [];
      }
    },
    defaultResourceQuotaLimits: {
      type:    Object,
      default: () => {
        return {};
      }
    },
    hasLimitMemoryRow: {
      type:    Boolean,
      default: false,
    },
    vmCount: {
      type:    [Number, String],
      default: '',
    },
    maintenanceQuota: {
      type:    Object,
      default: () => {
        return {};
      },
    },
  },

  data() {
    return { userLimit: '' };
  },

  mounted() {
    // We want to update the value first so that the value will be rounded to the project limit.
    // This is relevant when switching projects. If the value is 1200 and the project that it was
    // switched to only has capacity for 800 more this will force the value to be set to 800.
    if (this.value?.limit?.[this.type]) {
      this.update(this.value.limit[this.type]);
    }

    if (this.maintenanceQuota?.limit?.[this.maintenanceType]) {
      this.updateMaintenance(this.maintenanceQuota.limit[this.maintenanceType]);
    }

    if (!this.value?.limit?.[this.type]) {
      if (!this.userLimit && this.isMemoryRow) {
        const userLimit = this.getUserLimit(this.defaultResourceQuotaLimits[this.type]);

        this.updateUserLimit(userLimit);
      } else {
        this.update(this.defaultResourceQuotaLimits[this.type]);
      }
    }

    if (!this.maintenanceQuota?.limit?.[this.maintenanceType]) {
      this.updateMaintenance(DEFAULT_MAINTENANCE);
    }

    // if (!this.userLimit && this.type === 'limitsMemory') {
    //   const limitsMemory = Number(formatSi(parseSi(this.defaultResourceQuotaLimits[this.type], this.siOptions), {
    //     ...this.siOptions,
    //     addSuffixSpace: false,
    //     addSuffix: false,
    //   }))

    //   if (limitsMemory !== 0) {
    //     const extraLimit = this.getExtraLimit({
    //       vmCount: this.vmCount,
    //       userLimit: this.defaultResourceQuotaLimits[this.type],
    //     })
    //     const out = limitsMemory - extraLimit;

    //               console.log(out, 'data-userLimit')
    // console.log(extraLimit, 'data-extraLimit')
    // console.log(limitsMemory, 'limitsMemory')
    // console.log(this.defaultResourceQuotaLimits[this.type], 'this.defaultResourceQuotaLimits[this.type]')

    //     this.updateUserLimit(`${ out }Mi`);
    //   }
    // }
  },

  computed: {
    ...ROW_COMPUTED,
    limitValue() {
      return parseSi(this.projectResourceQuotaLimits[this.type]);
    },
    siOptions() {
      return {
        maxExponent: this.typeOption.inputExponent,
        minExponent: this.typeOption.inputExponent,
        increment:   this.typeOption.increment,
        suffix:      this.typeOption.increment === 1024 ? 'i' : ''
      };
    },
    namespaceLimits() {
      return this.namespaceResourceQuotaLimits
        .filter(resourceQuota => resourceQuota[this.type] && resourceQuota.id !== this.namespace.id)
        .map(resourceQuota => parseSi(resourceQuota[this.type], this.siOptions));
    },
    namespaceContribution() {
      return this.namespaceLimits.reduce((sum, limit) => sum + limit, 0);
    },
    totalContribution() {
      return this.namespaceContribution + parseSi(this.value.limit[this.type] || '0', this.siOptions);
    },
    percentageUsed() {
      return Math.min(this.totalContribution * 100 / this.projectLimit, 100);
    },
    projectLimit() {
      return parseSi(this.projectResourceQuotaLimits[this.type] || 0, this.siOptions);
    },
    max() {
      return this.projectLimit - this.namespaceContribution;
    },
    availableResourceQuotas() {
      return formatSi(this.projectLimit - this.totalContribution, { ...this.siOptions, addSuffixSpace: false });
    },
    slices() {
      const out = [];

      this.namespaceLimits.forEach((limit, i) => {
        const lastValue = i > 0 ? this.namespaceLimits[i - 1] : 0;
        const sliceTotal = lastValue + limit;

        out.push(sliceTotal * 100 / this.projectLimit);
      });

      return out;
    },
    tooltip() {
      const t = this.$store.getters['i18n/t'];
      const out = [
        {
          label: t('resourceQuota.tooltip.reserved'),
          value: formatSi(this.namespaceContribution, { ...this.siOptions, addSuffixSpace: false }),
        },
        {
          label: t('resourceQuota.tooltip.namespace'),
          value: this.value.limit[this.type]
        },
        {
          label: t('resourceQuota.tooltip.available'),
          value: this.availableResourceQuotas
        },
        {
          label: t('resourceQuota.tooltip.max'),
          value: this.projectResourceQuotaLimits[this.type]
        }
      ];

      let formattedTooltip = '<div class="quota-percentage-tooltip">';

      (out || []).forEach((v) => {
        formattedTooltip += `
        <div style='margin-top: 5px; display: flex; justify-content: space-between;'>
          ${ v.label }
          <span style='margin-left: 20px;'>${ v.value }</span>
        </div>`;
      });
      formattedTooltip += '</div>';

      return formattedTooltip;
    },

    maintenanceType() {
      return `${ this.type }Percent`;
    },

    isMemoryRow() {
      return this.type === 'limitsMemory';
    },

    actualMax() {
      const extraLimit = this.getExtraLimit({
        vmCount:   this.vmCount,
        userLimit: this.userLimit,
        limitsCpu: this.value?.limit?.['limitsCpu'],
      });

      const out = this.max - parseSi(extraLimit, this.siOptions);

      return out > 0 ? out : 0;
    },

    hasAvailable() {
      return !(this.projectLimit - this.totalContribution < 0);
    },

    exceedQuota() {
      return formatSi(this.totalContribution - this.projectLimit, { ...this.siOptions, addSuffixSpace: false });
    },
  },

  methods: {
    update(newValue) {
      console.log(newValue, 'newValue');
      const parsedNewValue = parseSi(newValue, this.siOptions) || 0;
      const min = Math.max(parsedNewValue, 0);
      // const max = Math.min(min, this.max);
      const value = formatSi(min, {
        ...this.siOptions,
        addSuffixSpace: false
      });

      this.$emit('input', this.type, value);
    },

    updateMaintenance(value) {
      this.$emit('updateMaintenance', this.maintenanceType, value);
    },

    updateUserLimit(newValue) {
      const parsedNewValue = parseSi(newValue, this.siOptions) || 0;
      const min = Math.max(parsedNewValue, 0);
      // const max = Math.min(min, this.max);
      const value = Number(formatSi(min, {
        ...this.siOptions,
        addSuffixSpace: false,
        addSuffix:      false,
      }));

      console.log(value, 'value');

      this.userLimit = `${ value }Mi`;
      const extraLimit = this.getExtraLimit({
        vmCount:   this.vmCount,
        userLimit: `${ value }Mi`,
        limitsCpu: this.value?.limit?.['limitsCpu'],
      });

      const out = value + extraLimit;

      console.log(out, 'out');

      this.update(`${ out }Mi`);
    },

    getExtraLimit({
      vmCount = 0,
      userLimit = '0Mi',
      limitsCpu = '0m',
    }) {
      const limitsMemory = Number(formatSi(parseSi(userLimit, this.siOptions), {
        ...this.siOptions,
        addSuffixSpace: false,
        addSuffix:      false,
      }));

      const out = parseSi(limitsCpu) * 8 +
                  16 +
                  8 +
                  vmCount * 180 +
                  limitsMemory / 512;

      return Math.ceil(out);
    },

    getUserLimit(actual) {
      const actualLimit = Number(formatSi(parseSi(actual, this.siOptions), {
        ...this.siOptions,
        addSuffixSpace: false,
        addSuffix:      false,
      }));

      const limitsCpu = this.defaultResourceQuotaLimits['limitsCpu'] || '0m';

      const extra = parseSi(limitsCpu) * 8 +
                    16 +
                    8 +
                    this.vmCount * 180;

      const out = (actualLimit - extra) * 512 / 513;

      return `${ Math.floor(out > 0 ? out : 0) }Mi`;
    },
  },

  watch: {
    vmCount(value) {
      if (!this.isMemoryRow) {
        return;
      }

      const limitsMemory = Number(formatSi(parseSi(this.userLimit, this.siOptions), {
        ...this.siOptions,
        addSuffixSpace: false,
        addSuffix:      false,
      }));

      const extraLimit = this.getExtraLimit({
        vmCount:   value,
        userLimit: this.userLimit,
        limitsCpu: this.value?.limit?.['limitsCpu'],
      });

      this.update(`${ limitsMemory + extraLimit }Mi`);
    },

    'value.limit.limitsCpu'(value) {
      if (!this.isMemoryRow) {
        return;
      }

      const limitsMemory = Number(formatSi(parseSi(this.userLimit, this.siOptions), {
        ...this.siOptions,
        addSuffixSpace: false,
        addSuffix:      false,
      }));

      const extraLimit = this.getExtraLimit({
        vmCount:   this.vmCount,
        userLimit: this.userLimit,
        limitsCpu: value,
      });

      this.update(`${ limitsMemory + extraLimit }Mi`);
    },

    hasAvailable(value) {
      this.$emit('updateAvailableQuota', this.type, value);
    },
  }
};
</script>
<template>
  <div class="mb-10">
    <div
      v-if="typeOption"
      class="row"
    >
      <Select
        class="mr-10"
        :mode="mode"
        :value="type"
        :disabled="true"
        :options="types"
      />
      <div class="resource-availability mr-10">
        <PercentageBar
          v-tooltip="tooltip"
          class="percentage-bar"
          :value="percentageUsed"
          :slices="slices"
          :color-stops="{'100': '--primary'}"
        />
      </div>
      <div class="mr-10">
        <UnitInput
          v-if="hasLimitMemoryRow && isMemoryRow"
          :value="userLimit"
          :mode="mode"
          :placeholder="typeOption.placeholder"
          :increment="typeOption.increment"
          :input-exponent="typeOption.inputExponent"
          :base-unit="typeOption.baseUnit"
          :output-modifier="true"
          @input="updateUserLimit"
        />
        <UnitInput
          v-else
          :value="value.limit[type]"
          :mode="mode"
          :placeholder="typeOption.placeholder"
          :increment="typeOption.increment"
          :input-exponent="typeOption.inputExponent"
          :base-unit="typeOption.baseUnit"
          :output-modifier="true"
          @input="update"
        />
      </div>
      <div
        v-if="hasLimitMemoryRow"
        class="mr-10"
      >
        <UnitInput
          :value="value.limit[type]"
          :mode="mode"
          :placeholder="typeOption.placeholder"
          :increment="typeOption.increment"
          :input-exponent="typeOption.inputExponent"
          :base-unit="typeOption.baseUnit"
          :output-modifier="true"
          disabled
        />
      </div>
      <UnitInput
        :value="maintenanceQuota.limit[maintenanceType]"
        :mode="mode"
        :placeholder="typeOption.placeholder"
        suffix="%"
        @input="updateMaintenance"
      />
    </div>
    <div
      v-if="typeOption && !hasAvailable"
      class="row mt-5"
    >
      <span />
      <span />
      <span />
      <span
        v-if="hasLimitMemoryRow"
        class="text-error text-small"
      >
        {{ t('harvester.resourceQuota.actualLimit.exceedQuota', {quota: exceedQuota}) }}
      </span>
      <span />
    </div>
  </div>
</template>

<style lang='scss' scoped>
  .resource-availability {
    align-self: center;
  }
  .row {
    display: flex;
    flex-direction: row;
    justify-content: space-evenly;

    & > * {
      width: 100%;
    }
  }
</style>
