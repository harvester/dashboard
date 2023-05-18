<script>
import ResourceTabs from '@shell/components/form/ResourceTabs';
import Tab from '@shell/components/Tabbed/Tab';
import SortableTable from '@shell/components/SortableTable';
import { NETWORK_ATTACHMENT } from '@shell/config/types';
import { allHash } from '@shell/utils/promise';
import { NETWORK_HEADERS } from '@pkg/harvester/list/harvesterhci.io.networkattachmentdefinition.vue';

export default {
  components: {
    ResourceTabs,
    Tab,
    SortableTable,
  },

  props: {
    value: {
      type:    Object,
      default: () => {
        return {};
      }
    }
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;

    const hash = { ipPools: this.$store.dispatch(`${ inStore }/findAll`, { type: NETWORK_ATTACHMENT }) };

    await allHash(hash);
  },

  computed: {
    networks() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const networks = this.$store.getters[`${ inStore }/all`](NETWORK_ATTACHMENT);

      return networks.filter(n => n?.id === this.value?.spec?.selector?.network);
    },

    networkHeaders() {
      return NETWORK_HEADERS;
    },

    ranges() {
      return this.value.spec.ranges;
    },

    rangeHeaders() {
      return [{
        name:  'subnet',
        label: this.t('harvester.ipPool.subnet.label'),
        value: 'subnet',
      }, {
        name:  'gateway',
        label: this.t('harvester.ipPool.gateway.label'),
        value: 'gateway',
      }, {
        name:  'startIP',
        label: this.t('harvester.ipPool.startIP.label'),
        value: 'rangeStart',
      }, {
        name:  'endIP',
        label: this.t('harvester.ipPool.endIP.label'),
        value: 'rangeEnd',
      }];
    },
  },
};
</script>

<template>
  <ResourceTabs
    v-model="value"
    :need-related="false"
  >
    <Tab
      name="network"
      label-key="harvester.ipPool.network.label"
      :weight="99"
    >
      <SortableTable
        key-field="_key"
        :headers="networkHeaders"
        :rows="networks"
        :row-actions="false"
        :table-actions="false"
        :search="false"
      />
    </Tab>
    <Tab
      name="range"
      label-key="harvester.ipPool.tabs.range"
      :weight="89"
    >
      <SortableTable
        key-field="_key"
        :headers="rangeHeaders"
        :rows="ranges"
        :row-actions="false"
        :table-actions="false"
        :search="false"
      />
    </Tab>
  </ResourceTabs>
</template>
