<script>
import ConsumptionGauge from '@shell/components/ConsumptionGauge';
import { METRIC, NODE, LONGHORN } from '@shell/config/types';
import { formatSi, exponentNeeded, UNITS, parseSi } from '@shell/utils/units';

export default {
  name:       'HarvesterMemoryUsed',
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

    showUsed: {
      type:    Boolean,
      default: false,
    },
  },

  data() {
    return {};
  },

  computed: {
    metrics() {
      return this.$store.getters['harvester/byId'](METRIC.NODE, this.row.id);
    },

    memoryTotal() {
      let out = 0;

      if (this.metrics) {
        out = this.metrics.memoryCapacity;
      }

      return out;
    },

    memoryUnits() {
      const exponent = exponentNeeded(this.memoryTotal, 1024);

      return `${ UNITS[exponent] }iB`;
    },

    node() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const node = this.$store.getters[`${ inStore }/byId`](NODE, this.row.id);

      return node;
    },

    reserved() {
      if (this.metrics) {
        return this.node.memoryReserved;
      } else {
        return 0;
      }
    },

    used() {
      if (this.metrics) {
        return parseSi(this.metrics?.usage?.memory || '0m', { increment: 1024 });
      } else {
        return 0;
      }
    },

    hasLonghornSchema() {
      const inStore = this.$store.getters['currentProduct'].inStore;

      return !!this.$store.getters[`${ inStore }/schemaFor`](LONGHORN.NODES);
    },
  },

  methods: {
    memoryFormatter(value) {
      const exponent = exponentNeeded(this.memoryTotal, 1024);

      const formatOptions = {
        addSuffix:   false,
        increment:   1024,
        minExponent: exponent
      };

      return formatSi(value, formatOptions);
    },
  }
};
</script>

<template>
  <div :class="[hasLonghornSchema ? 'sm-min-width' : 'xs-min-width']">
    <ConsumptionGauge
      :capacity="memoryTotal"
      :used="reserved"
      :units="memoryUnits"
      :number-formatter="memoryFormatter"
      :resource-name="resourceName"
    >
      <template #title="{amountTemplateValues, formattedPercentage}">
        <span>
          {{ t('clusterIndexPage.hardwareResourceGauge.reserved') }}
        </span>
        <span>
          {{ t('node.detail.glance.consumptionGauge.amount', amountTemplateValues) }}
          <span class="ml-10 percentage">/&nbsp;{{ formattedPercentage }}
          </span>
        </span>
      </template>
    </ConsumptionGauge>
    <div
      v-if="showUsed"
      class="mt-10"
    >
      <ConsumptionGauge
        :capacity="memoryTotal"
        :used="used"
        :units="memoryUnits"
        :number-formatter="memoryFormatter"
      >
        <template #title="{amountTemplateValues, formattedPercentage}">
          <span>
            {{ t('clusterIndexPage.hardwareResourceGauge.used') }}
          </span>
          <span>
            {{ t('node.detail.glance.consumptionGauge.amount', amountTemplateValues) }}
            <span class="ml-10 percentage">/&nbsp;{{ formattedPercentage }}
            </span>
          </span>
        </template>
      </ConsumptionGauge>
    </div>
  </div>
</template>

<style lang='scss' scoped>
  .xs-min-width {
    min-width: 230px;
  }

  .sm-min-width {
    min-width: 345px;
  }
</style>
