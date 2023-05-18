<script>
import ResourceTabs from '@shell/components/form/ResourceTabs';
import Tab from '@shell/components/Tabbed/Tab';
import SortableTable from '@shell/components/SortableTable';
import { HCI } from '@pkg/harvester/types';
import { allHash } from '@shell/utils/promise';
import { IP_POOL_HEADERS } from '@pkg/harvester/config/harvester';
import { KEY, VALUE } from '@shell/config/table-headers';
import { VM_HEADERS } from '@pkg/harvester/list/kubevirt.io.virtualmachine';
import { matching } from '@shell/utils/selector';

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

    const hash = {
      ipPools: this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.IP_POOL }),
      vms:     this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.VM }),
    };

    await allHash(hash);
  },

  computed: {
    ipPools() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const ipPools = this.$store.getters[`${ inStore }/all`](HCI.IP_POOL);

      return ipPools.filter(i => i.id === this.value.status.allocatedAddress.ipPool);
    },

    ipPoolHeaders() {
      return IP_POOL_HEADERS;
    },

    listeners() {
      const listeners = this.value?.spec?.listeners;

      return listeners;
    },

    listenerHeaders() {
      return [
        {
          name:  'name',
          label: this.t('tableHeaders.name'),
          value: 'name',
          sort:  'name:desc',
        },
        {
          name:  'port',
          label: this.t('tableHeaders.port'),
          value: 'port',
          sort:  'port:desc',
        },
        {
          name:  'protocol',
          label: this.t('tableHeaders.protocol'),
          value: 'protocol',
          sort:  'protocol:desc',
        },
        {
          name:  'backendPort',
          label: this.t('harvester.loadBalancer.listeners.backendPort.label'),
          value: 'backendPort',
          sort:  'backendPort:desc',
        },
      ];
    },

    backendServerSelectors() {
      return Object.keys(this.value.spec?.backendServerSelector || {}).map(key => ({
        key,
        value: this.value.spec.backendServerSelector[key],
      }));
    },

    serviceSelectorInfoHeaders() {
      return [
        {
          ...KEY,
          width: 200,
        },
        VALUE,
      ];
    },

    vmHeaders() {
      const filterNames = ['state', 'ip', 'node'];

      return VM_HEADERS.filter(h => !filterNames.includes(h.name));
    },

    vms() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const vms = this.$store.getters[`${ inStore }/all`](HCI.VM).filter(vm => vm.metadata.namespace === this.value.metadata.namespace);
      const match = matching(vms, this.value?.spec?.backendServerSelector, 'spec.template.metadata.labels');

      return match;
    }
  },
};
</script>

<template>
  <ResourceTabs
    v-model="value"
    :need-related="false"
  >
    <Tab
      v-if="value.spec.ipam === 'pool'"
      name="ipPool"
      label-key="harvester.loadBalancer.ipPool.label"
      :weight="99"
    >
      <SortableTable
        key-field="_key"
        :headers="ipPoolHeaders"
        :rows="ipPools"
        :row-actions="false"
        :table-actions="false"
        :search="false"
      />
    </Tab>
    <Tab
      v-if="value.spec.workloadType === 'vm'"
      name="vm"
      :label="t('harvester.loadBalancer.backendServers.label')"
      class="bordered-table"
      :weight="98"
    >
      <SortableTable
        :rows="vms"
        :headers="vmHeaders"
        key-field="id"
        :row-actions="false"
        :table-actions="false"
        :search="vms.length > 10 ? true : false"
      />
    </Tab>
    <Tab
      v-if="value.spec.workloadType === 'vm'"
      name="listeners"
      :label="t('harvester.loadBalancer.tabs.listeners')"
      class="bordered-table"
      :weight="89"
    >
      <SortableTable
        key-field="_key"
        :headers="listenerHeaders"
        :rows="listeners"
        :row-actions="false"
        :table-actions="false"
        :search="false"
      />
    </Tab>
    <Tab
      v-if="value.spec.workloadType === 'vm'"
      name="selector"
      :label="t('harvester.loadBalancer.tabs.backendServer')"
      class="bordered-table"
      :weight="79"
    >
      <SortableTable
        key-field="_key"
        :headers="serviceSelectorInfoHeaders"
        :rows="backendServerSelectors"
        :row-actions="false"
        :table-actions="false"
        :show-headers="true"
        :search="false"
      />
    </Tab>
  </ResourceTabs>
</template>
