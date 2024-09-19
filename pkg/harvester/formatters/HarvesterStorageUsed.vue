<script>
import ConsumptionGauge from '@shell/components/ConsumptionGauge';
import { LONGHORN } from '@shell/config/types';
import { formatSi, exponentNeeded, UNITS } from '@shell/utils/units';

export default {
  name:       'HarvesterStorageUsed',
  components: { ConsumptionGauge },

  props: {
    value: {
      type:    String,
      default: ''
    },

    row: {
      type:     Object,
      required: true
    },

    resourceName: {
      type:    String,
      default: ''
    },

    showAllocated: {
      type:    Boolean,
      default: false,
    },
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;

    this.longhornSettings = await this.$store.dispatch(`${ inStore }/findAll`, { type: LONGHORN.SETTINGS });
  },

  data() {
    const inStore = this.$store.getters['currentProduct'].inStore;
    const longhornSettings = this.$store.getters[`${ inStore }/all`](LONGHORN.SETTINGS) || [];

    return { longhornSettings };
  },

  computed: {
    storageStats() {
      const stats = {
        used:      0,
        scheduled: 0,
        maximum:   0,
        reserved:  0,
        total:     0
      };
      const inStore = this.$store.getters['currentProduct'].inStore;
      const node = this.$store.getters[`${ inStore }/byId`](LONGHORN.NODES, `longhorn-system/${ this.row.id }`) || {};
      const storageOverProvisioningPercentageSetting = this.longhornSettings.find(s => s.id === 'longhorn-system/storage-over-provisioning-percentage');
      const disks = node?.spec?.disks || {};
      const diskStatus = node?.status?.diskStatus || {};

      stats.used += node?.spec?.allowScheduling ? node.used : 0;

      Object.keys(disks).map((key) => {
        stats.scheduled += node?.spec?.allowScheduling ? (diskStatus[key]?.storageScheduled || 0) : 0;
        stats.reserved += disks[key]?.storageReserved || 0;
      });
      Object.values(diskStatus).map((diskStat) => {
        stats.maximum += diskStat?.storageMaximum || 0;
      });

      stats.total = ((stats.maximum - stats.reserved) * Number(storageOverProvisioningPercentageSetting?.value ?? 0)) / 100;

      return stats;
    },

    units() {
      const exponent = exponentNeeded(this.storageStats.maximum, 1024);

      return `${ UNITS[exponent] }iB`;
    },

    used() {
      let out = this.formatter(this.storageStats.used);

      if (!Number.parseFloat(out) > 0) {
        out = this.formatter(this.storageStats.used, { canRoundToZero: false });
      }

      return out;
    },

    formatAllocated() {
      let out = this.formatter(this.storageStats.scheduled);

      if (!Number.parseFloat(out) > 0) {
        out = this.formatter(this.storageStats.scheduled, { canRoundToZero: false });
      }

      return out;
    },

    usedAmountTemplateValues() {
      return {
        used:  this.used,
        total: this.formatter(this.storageStats.maximum),
        unit:  this.units,
      };
    },

    allocatedAmountTemplateValues() {
      return {
        used:  this.formatAllocated,
        total: this.formatter(this.storageStats.total),
        unit:  this.units,
      };
    },
  },

  methods: {
    formatter(value, format) {
      const minExponent = exponentNeeded(this.storageStats.maximum, 1024);
      const formatOptions = {
        addSuffix: false,
        increment: 1024,
        minExponent,
      };

      return formatSi(value, {
        ...formatOptions,
        ...format,
      });
    },
  }
};
</script>

<template>
  <div>
    <div
      v-if="showAllocated"
    >
      <ConsumptionGauge
        :capacity="storageStats.total"
        :used="storageStats.scheduled"
        :units="units"
        :number-formatter="formatter"
        :resource-name="resourceName"
      >
        <template #title="{formattedPercentage}">
          <span>
            {{ t('harvester.dashboard.hardwareResourceGauge.allocated') }}
          </span>
          <span class="precent-data">
            {{ t('node.detail.glance.consumptionGauge.amount', allocatedAmountTemplateValues) }}
            <span class="ml-10 percentage">
              /&nbsp;{{ formattedPercentage }}
            </span>
          </span>
        </template>
      </ConsumptionGauge>
    </div>
    <ConsumptionGauge
      :capacity="storageStats.maximum"
      :used="storageStats.used"
      :units="units"
      :number-formatter="formatter"
      :resource-name="showAllocated ? '' : resourceName"
      :class="{
        'mt-10': showAllocated,
      }"
    >
      <template #title="{formattedPercentage}">
        <span>
          {{ t('node.detail.glance.consumptionGauge.used') }}
        </span>
        <span class="precent-data">
          {{ t('node.detail.glance.consumptionGauge.amount', usedAmountTemplateValues) }}
          <span class="ml-10 percentage">
            /&nbsp;{{ formattedPercentage }}
          </span>
        </span>
      </template>
    </ConsumptionGauge>
  </div>
</template>

<style lang="scss" scoped>
.precent-data {
  white-space: nowrap;
}
</style>
