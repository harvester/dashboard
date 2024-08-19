<script>
import ResourceTable from '@shell/components/ResourceTable';
import Loading from '@shell/components/Loading';
import { STATE, NAME, AGE } from '@shell/config/table-headers';
import {
  CAPI, METRIC, NODE, SCHEMA, LONGHORN, POD
} from '@shell/config/types';
import { HCI } from '../types';
import { DOC_LINKS } from '../config/doc-links';
import { allHash } from '@shell/utils/promise';
import metricPoller from '@shell/mixins/metric-poller';

const schema = {
  id:         HCI.HOST,
  type:       SCHEMA,
  attributes: {
    kind:       HCI.HOST,
    namespaced: true
  },
  metadata: { name: HCI.HOST },
};

export default {
  name: 'HarvesterListHost',

  components: {
    ResourceTable,
    Loading,
  },

  mixins: [metricPoller],

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;
    const _hash = {
      nodes: this.$store.dispatch(`${ inStore }/findAll`, { type: NODE }),
      pods:  this.$store.dispatch(`${ inStore }/findAll`, { type: POD }),
    };

    if (this.$store.getters[`${ inStore }/schemaFor`](METRIC.NODE)) {
      _hash.metric = this.$store.dispatch(`${ inStore }/findAll`, { type: METRIC.NODE });
    } else {
      this.hasMetricSchema = false;
    }

    if (this.$store.getters[`${ inStore }/schemaFor`](LONGHORN.NODES)) {
      _hash.longhornNodes = this.$store.dispatch(`${ inStore }/findAll`, { type: LONGHORN.NODES });
    } else {
      this.hasLonghornSchema = false;
    }

    if (this.$store.getters[`${ inStore }/schemaFor`](HCI.BLOCK_DEVICE)) {
      _hash.blockDevices = this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.BLOCK_DEVICE });
    }

    if (this.$store.getters[`${ inStore }/schemaFor`](HCI.INVENTORY)) {
      _hash.inventories = this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.INVENTORY });
    }

    if (this.$store.getters[`${ inStore }/schemaFor`](CAPI.MACHINE)) {
      _hash.machines = this.$store.dispatch(`${ inStore }/findAll`, { type: CAPI.MACHINE });
    }

    const hash = await allHash(_hash);

    this.rows = hash.nodes;
  },

  data() {
    return {
      rows:              [],
      hasMetricSchema:   true,
      hasLonghornSchema: true,
    };
  },

  computed: {
    headers() {
      const out = [
        {
          ...STATE,
          formatter: 'StateWithPopover',
        },
        {
          ...NAME,
          width: 130,
        },
        {
          name:      'host-ip',
          labelKey:  'tableHeaders.hostIp',
          search:    ['internalIp'],
          value:     'internalIp',
          formatter: 'CopyToClipboard',
          sort:      ['internalIp'],
          align:     'center',
        },
      ];

      if (this.hasMetricSchema) {
        const metricCol = [
          {
            name:          'cpu',
            labelKey:      'node.detail.glance.consumptionGauge.cpu',
            value:         'id',
            formatter:     'HarvesterCPUUsed',
            formatterOpts: { showUsed: true },
          },
          {
            name:          'memory',
            labelKey:      'node.detail.glance.consumptionGauge.memory',
            value:         'id',
            formatter:     'HarvesterMemoryUsed',
            formatterOpts: { showUsed: true },
          },
        ];

        out.splice(-1, 0, ...metricCol);
      }

      if (this.hasLonghornSchema) {
        const storageHeader = {
          name:          'storage',
          labelKey:      'tableHeaders.storage',
          value:         'id',
          formatter:     'HarvesterStorageUsed',
          formatterOpts: { showAllocated: true },
        };

        out.splice(-1, 0, storageHeader);
      }

      out.push({
        name:          'cpuManager',
        labelKey:      'harvester.tableHeaders.cpuManager',
        value:         'id',
        formatter:     'HarvesterCPUPinning',
        formatterOpts: { rows: this.rows },
        width:         150,
        align:         'center',

      });

      if (this.hasLonghornSchema) {
        out.push({
          name:      'diskState',
          labelKey:  'tableHeaders.diskState',
          value:     'diskState',
          formatter: 'HarvesterDiskState',
          width:     130,
        });
      }

      out.push(AGE);

      out.push({
        name:  'console',
        label: ' ',
        align: 'right',
        width: 80,
      });

      return out;
    },

    schema() {
      return schema;
    },

    consoleDocLink() {
      return DOC_LINKS.CONSOLE_URL;
    }
  },
  methods: {
    async loadMetrics() {
      const schema = this.$store.getters['harvester/schemaFor'](METRIC.NODE);

      if (schema) {
        await this.$store.dispatch('harvester/findAll', {
          type: METRIC.NODE,
          opt:  { force: true }
        });

        this.$forceUpdate();
      }
    },

    goto(row) {
      window.open(row.consoleUrl, '_blank');
    },

    consoleTooltip(row) {
      if (!row.consoleUrl) {
        return this.t('harvester.host.noConsoleUrl');
      }

      return '';
    },
  },

  typeDisplay() {
    const { params:{ resource: type } } = this.$route;
    let paramSchema = schema;

    if (type !== schema.id) {
      paramSchema = this.$store.getters['harvester/schemaFor'](type);
    }

    return this.$store.getters['type-map/labelFor'](paramSchema, 99);
  },
};
</script>

<template>
  <Loading v-if="$fetchState.pending" />
  <div v-else>
    <ResourceTable
      v-bind="$attrs"
      :schema="schema"
      :groupable="false"
      :headers="headers"
      :rows="[...rows]"
      :namespaced="false"
      key-field="_key"
      v-on="$listeners"
    >
      <template #cell:console="{row}">
        <div class="console-button">
          <button v-clean-tooltip="consoleTooltip(row)" type="button" class="mr-5 btn btn-sm role-primary" :disabled="!row.consoleUrl" @click="goto(row)">
            {{ t('harvester.host.console') }}
          </button>
          <a v-if="!row.consoleUrl" :href="consoleDocLink" target="_blank"><i class="icon icon-info" /></a>
        </div>
      </template>
    </ResourceTable>
  </div>
</template>

<style lang="scss" scoped>
  .console-button {
    display: flex;
  }
</style>
