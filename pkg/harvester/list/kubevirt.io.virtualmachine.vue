<script>
import ConsoleBar from '../components/VMConsoleBar';
import ResourceTable from '@shell/components/ResourceTable';
import HarvesterVmState from '../formatters/HarvesterVmState';
import {
  PVC, PV, NODE, POD, STORAGE_CLASS
} from '@shell/config/types';
import { STATE, AGE, NAME, NAMESPACE } from '@shell/config/table-headers';
import { HCI } from '../types';
import { allHash } from '@shell/utils/promise';
import Loading from '@shell/components/Loading';
import { clone } from '@shell/utils/object';

export const VM_HEADERS = [
  STATE,
  {
    ...NAME,
    width: 350,
  },
  NAMESPACE,
  {
    name:        'CPU',
    label:       'CPU',
    sort:        ['spec.template.spec.domain.cpu.cores'],
    value:       'spec.template.spec.domain.cpu.cores',
    align:       'center',
    dashIfEmpty: true,
  },
  {
    name:          'Memory',
    value:         'displayMemory',
    sort:          ['memorySort'],
    align:         'center',
    labelKey:      'tableHeaders.memory',
    formatter:     'Si',
    formatterOpts: {
      opts: {
        increment: 1024, addSuffix: true, maxExponent: 3, minExponent: 3, suffix: 'i',
      },
      needParseSi: true
    },
  },
  {
    name:      'ip',
    label:     'IP Address',
    value:     'id',
    formatter: 'HarvesterIpAddress',
    labelKey:  'tableHeaders.ipAddress',
    sort:      ['id'],
  },
  {
    ...AGE,
    sort: 'metadata.creationTimestamp:desc',
  }
];

export default {
  name:       'HarvesterListVM',
  components: {
    Loading,
    HarvesterVmState,
    ConsoleBar,
    ResourceTable
  },

  props: {
    schema: {
      type:     Object,
      required: true,
    },
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;
    const _hash = {
      vms:     this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.VM }),
      pod:     this.$store.dispatch(`${ inStore }/findAll`, { type: POD }),
      pvcs:    this.$store.dispatch(`${ inStore }/findAll`, { type: PVC }),
      pvs:     this.$store.dispatch(`${ inStore }/findAll`, { type: PV }),
      images:  this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.IMAGE }),
      restore: this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.RESTORE }),
      backups: this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.BACKUP }),
      storage: this.$store.dispatch(`${ inStore }/findAll`, { type: STORAGE_CLASS }),
    };

    if (this.$store.getters[`${ inStore }/schemaFor`](HCI.RESOURCE_QUOTA)) {
      _hash.resourceQuotas = this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.RESOURCE_QUOTA });
    }

    if (this.$store.getters[`${ inStore }/schemaFor`](NODE)) {
      _hash.nodes = this.$store.dispatch(`${ inStore }/findAll`, { type: NODE });
      this.hasNode = true;
    }

    if (this.$store.getters[`${ inStore }/schemaFor`](HCI.NODE_NETWORK)) {
      _hash.nodeNetworks = this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.NODE_NETWORK });
    }

    if (this.$store.getters[`${ inStore }/schemaFor`](HCI.CLUSTER_NETWORK)) {
      _hash.clusterNetworks = this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.CLUSTER_NETWORK });
    }

    const hash = await allHash(_hash);

    this.allVMs = hash.vms;
    this.allNodeNetworks = hash.nodeNetworks || [];
    this.allClusterNetworks = hash.clusterNetworks || [];
  },

  data() {
    return {
      hasNode:            false,
      allVMs:             [],
      allVMIs:            [],
      allNodeNetworks:    [],
      allClusterNetworks: [],
      HCI
    };
  },

  computed: {
    headers() {
      const restoreCol = {
        name:      'restoreProgress',
        labelKey:  'harvester.tableHeaders.restore',
        value:     'restoreProgress',
        align:     'left',
        formatter: 'HarvesterBackupProgressBar',
        width:     200,
      };
      const nodeCol = {
        name:      'node',
        label:     'Node',
        value:     'nodeName',
        sort:      ['realAttachNodeName'],
        formatter: 'HarvesterHost',
        labelKey:  'harvester.tableHeaders.vm.node'
      };

      const cols = clone(VM_HEADERS);

      if (this.hasNode) {
        cols.splice(-1, 0, nodeCol);
      }

      if (this.hasBackUpRestoreInProgress) {
        cols.splice(-1, 0, restoreCol);
      }

      return cols;
    },

    rows() {
      const matchVMIs = this.allVMIs.filter(VMI => !this.allVMs.find(VM => VM.id === VMI.id));

      return [...this.allVMs, ...matchVMIs];
    },

    /**
     * We want to show the progress bar only for Backup's restore; snapshot's restore is immediate.
     */
    hasBackUpRestoreInProgress() {
      return !!this.rows.find(r => r.restoreResource && !r.restoreResource.fromSnapshot && !r.restoreResource.isComplete);
    }
  },

  async created() {
    const inStore = this.$store.getters['currentProduct'].inStore;
    const vmis = await this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.VMI });

    await this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.VMIM });

    this.$set(this, 'allVMIs', vmis);
  },

  methods: {
    lockIconTooltipMessage(row) {
      const message = '';

      if (row.encryptedVolumeType === 'all') {
        return this.t('harvester.virtualMachine.volume.lockTooltip.all');
      } else if (row.encryptedVolumeType === 'partial') {
        return this.t('harvester.virtualMachine.volume.lockTooltip.partial');
      }

      return message;
    }
  }
};
</script>

<template>
  <Loading v-if="$fetchState.pending" />
  <div v-else>
    <ResourceTable
      v-bind="$attrs"
      :headers="headers"
      default-sort-by="age"
      :rows="rows"
      :schema="schema"
      :groupable="true"
      key-field="_key"
      v-on="$listeners"
    >
      <template slot="cell:state" slot-scope="scope" class="state-col">
        <div class="state">
          <HarvesterVmState class="vmstate" :row="scope.row" :all-node-network="allNodeNetworks" :all-cluster-network="allClusterNetworks" />
        </div>
      </template>

      <template slot="cell:name" slot-scope="scope">
        <div class="name-console">
          <n-link
            v-if="scope.row.type !== HCI.VMI"
            :to="scope.row.detailLocation"
          >
            {{ scope.row.metadata.name }}
            <i
              v-if="lockIconTooltipMessage(scope.row)"
              v-tooltip="lockIconTooltipMessage(scope.row)"
              class="icon icon-lock"
              :class="{'green-icon': scope.row.encryptedVolumeType === 'all', 'yellow-icon': scope.row.encryptedVolumeType === 'partial'}"
            />
          </n-link>
          <span v-else>
            {{ scope.row.metadata.name }}
          </span>
          <ConsoleBar :resource="scope.row" class="console mr-10 ml-10" />
        </div>
      </template>
    </ResourceTable>
  </div>
</template>

<style lang="scss" scoped>
.state {
  display: flex;

  .vmstate {
    margin-right: 6px;
  }
}

.green-icon {
  color: var(--success);
}

.yellow-icon {
  color: var(--warning);
}

.name-console {
  display: flex;
  align-items: center;
  justify-content: space-between;

  span {
    padding-right: 4px;
    line-height: 26px;
    white-space: nowrap;
  }
}
</style>
