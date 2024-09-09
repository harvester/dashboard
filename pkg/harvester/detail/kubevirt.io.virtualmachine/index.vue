<script>
import { mapGetters } from 'vuex';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import LabelValue from '@shell/components/LabelValue';
import { EVENT, SERVICE, POD } from '@shell/config/types';
import { HCI } from '../../types';
import CreateEditView from '@shell/mixins/create-edit-view';
import VM_MIXIN from '../../mixins/harvester-vm';
import DashboardMetrics from '@shell/components/DashboardMetrics';
import { allHash, setPromiseResult } from '@shell/utils/promise';
import { allDashboardsExist } from '@shell/utils/grafana';
import CloudConfig from '../../edit/kubevirt.io.virtualmachine/VirtualMachineCloudConfig';
import Volume from '../../edit/kubevirt.io.virtualmachine/VirtualMachineVolume';
import Network from '../../edit/kubevirt.io.virtualmachine/VirtualMachineNetwork';
import NodeScheduling from '@shell/components/form/NodeScheduling';
import PodAffinity from '@shell/components/form/PodAffinity';
import AccessCredentials from '../../edit/kubevirt.io.virtualmachine/VirtualMachineAccessCredentials';
import Events from './VirtualMachineTabs/VirtualMachineEvents';
import Migration from './VirtualMachineTabs/VirtualMachineMigration';
import OverviewBasics from './VirtualMachineTabs/VirtualMachineBasics';
import OverviewKeypairs from './VirtualMachineTabs/VirtualMachineKeypairs';
import KeyValue from '@shell/components/form/KeyValue';
import Labels from '@shell/components/form/Labels';
import { formatSi } from '@shell/utils/units';

const VM_METRICS_DETAIL_URL = '/api/v1/namespaces/cattle-monitoring-system/services/http:rancher-monitoring-grafana:80/proxy/d/harvester-vm-detail-1/vm-info-detail?orgId=1';

export default {
  name: 'VMIDetailsPage',

  components: {
    Tab,
    Tabbed,
    Events,
    OverviewBasics,
    LabelValue,
    Volume,
    Network,
    OverviewKeypairs,
    CloudConfig,
    Migration,
    DashboardMetrics,
    AccessCredentials,
    NodeScheduling,
    PodAffinity,
    KeyValue,
    Labels,
  },

  mixins: [CreateEditView, VM_MIXIN],

  props: {
    value: {
      type:     Object,
      required: true,
    },
  },

  data() {
    return {
      hasResourceQuotaSchema: false,
      switchToCloud:          false,
      VM_METRICS_DETAIL_URL,
      showVmMetrics:          false,
    };
  },

  async created() {
    const inStore = this.$store.getters['currentProduct'].inStore;

    this.hasResourceQuotaSchema = !!this.$store.getters[`${ inStore }/schemaFor`](HCI.RESOURCE_QUOTA);

    const hash = {
      pods:     this.$store.dispatch(`${ inStore }/findAll`, { type: POD }),
      services: this.$store.dispatch(`${ inStore }/findAll`, { type: SERVICE }),
      events:   this.$store.dispatch(`${ inStore }/findAll`, { type: EVENT }),
      allSSHs:  this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.SSH }),
      vmis:     this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.VMI }),
      restore:  this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.RESTORE }),
    };

    if (this.hasResourceQuotaSchema) {
      hash.resourceQuotas = this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.RESOURCE_QUOTA });
    }

    await allHash(hash);

    setPromiseResult(
      allDashboardsExist(this.$store, this.currentCluster.id, [VM_METRICS_DETAIL_URL], 'harvester'),
      this,
      'showVmMetrics',
      'Determine vm metrics'
    );
  },

  computed: {
    ...mapGetters(['currentCluster']),

    totalSnapshotSize() {
      if (this.value.snapshotSizeQuota === undefined || this.value.snapshotSizeQuota === null) {
        return ' - ';
      }

      if (this.value.snapshotSizeQuota === 0) {
        return '0';
      }

      return formatSi(this.value.snapshotSizeQuota, {
        increment: 1024,
        addSuffix: true,
        suffix:    'i',
      });
    },

    vmi() {
      const inStore = this.$store.getters['currentProduct'].inStore;

      const vmiList = this.$store.getters[`${ inStore }/all`](HCI.VMI) || [];
      const vmi = vmiList.find( (VMI) => {
        return VMI?.metadata?.ownerReferences?.[0]?.uid === this.value?.metadata?.uid;
      });

      return vmi;
    },

    allEvents() {
      const inStore = this.$store.getters['currentProduct'].inStore;

      return this.$store.getters[`${ inStore }/all`](EVENT);
    },

    events() {
      return this.allEvents.filter((e) => {
        const { name, creationTimestamp } = this.value?.metadata || {};
        const podName = this.value.podResource?.metadata?.name;
        const pvcName = this.value.persistentVolumeClaimName || [];

        const involvedName = e?.involvedObject?.name;

        const matchPVC = pvcName.find(name => name === involvedName);

        return (involvedName === name || involvedName === podName || matchPVC) && e.firstTimestamp >= creationTimestamp;
      }).sort((a, b) => {
        if (a.lastTimestamp > b.lastTimestamp) {
          return -1;
        }

        return 1;
      });
    },

    graphVars() {
      return {
        namespace: this.value.namespace,
        vm:        this.value.name
      };
    },
  },

  methods: {
    onTabChanged({ tab }) {
      if (tab.name === 'cloudConfig') {
        this.$refs.yamlEditor?.refresh();
      }
    },
  },

  watch: {
    value: {
      handler(neu) {
        const diskRows = this.getDiskRows(neu);

        this.$set(this, 'diskRows', diskRows);
      },
      deep: true
    }
  }
};
</script>

<template>
  <div>
    <Tabbed v-bind="$attrs" class="mt-15" :side-tabs="true" @changed="onTabChanged">
      <Tab name="basics" :label="t('harvester.virtualMachine.detail.tabs.basics')" class="bordered-table" :weight="7">
        <OverviewBasics v-model="value" :vmi="vmi" mode="view" />
      </Tab>

      <Tab name="disks" :label="t('harvester.tab.volume')" class="bordered-table" :weight="6">
        <Volume
          v-model="diskRows"
          mode="view"
          :namespace="value.metadata.namespace"
          :vm="value"
          :resource-type="value.type"
        />
      </Tab>

      <Tab name="networks" :label="t('harvester.virtualMachine.detail.tabs.networks')" class="bordered-table" :weight="5">
        <Network v-model="networkRows" mode="view" />
      </Tab>

      <Tab name="keypairs" :label="t('harvester.virtualMachine.detail.tabs.keypairs')" class="bordered-table" :weight="4">
        <OverviewKeypairs v-model="value" />
      </Tab>

      <Tab v-if="hasResourceQuotaSchema" name="quotas" :label="t('harvester.tab.quotas')" :weight="3">
        <LabelValue
          :name="t('harvester.snapshot.totalSnapshotSize')"
          :value="totalSnapshotSize"
        />
      </Tab>

      <Tab
        v-if="showVmMetrics"
        name="vm-metrics"
        :label="t('harvester.virtualMachine.detail.tabs.metrics')"
        :weight="2.5"
      >
        <template #default="props">
          <DashboardMetrics
            v-if="props.active"
            :detail-url="VM_METRICS_DETAIL_URL"
            graph-height="550px"
            :has-summary-and-detail="false"
            :vars="graphVars"
          />
        </template>
      </Tab>

      <Tab name="nodeScheduling" :label="t('workload.container.titles.nodeScheduling')" :weight="2.4">
        <template #default="{active}">
          <NodeScheduling v-if="spec" :key="active" :mode="mode" :value="spec.template.spec" :nodes="nodesIdOptions" />
        </template>
      </Tab>

      <Tab :label="t('harvester.tab.vmScheduling')" name="vmScheduling" :weight="2.3">
        <template #default="{active}">
          <PodAffinity
            v-if="spec"
            :key="active"
            :mode="mode"
            :value="spec.template.spec"
            :nodes="nodes"
            :all-namespaces-option-available="true"
            :namespaces="filteredNamespaces"
            :overwrite-labels="affinityLabels"
          />
        </template>
      </Tab>

      <Tab :label="t('harvester.tab.accessCredentials')" class="bordered-table" name="accessCredentials" :weight="2.2">
        <AccessCredentials mode="view" :value="accessCredentials" :resource="value" />
      </Tab>

      <Tab name="cloudConfig" :label="t('harvester.virtualMachine.detail.tabs.cloudConfig')" class="bordered-table" :weight="2">
        <CloudConfig
          ref="yamlEditor"
          mode="view"
          :user-script="userScript"
          :network-script="networkScript"
        />
      </Tab>

      <Tab name="event" :label="t('harvester.virtualMachine.detail.tabs.events')" :weight="1">
        <Events :resource="vmi" :events="events" />
      </Tab>

      <Tab name="migration" :label="t('harvester.virtualMachine.detail.tabs.migration')">
        <Migration v-model="value" :vmi-resource="vmi" />
      </Tab>

      <Tab
        name="instanceLabel"
        :label="t('harvester.tab.instanceLabel')"
        :weight="-99"
      >
        <Labels
          :default-container-class="'labels-and-annotations-container'"
          :value="value"
          :mode="mode"
          :display-side-by-side="false"
          :show-annotations="false"
          :show-label-title="false"
        >
          <template #labels="{toggler}">
            <KeyValue
              key="labels"
              :value="value.instanceLabels"
              :protected-keys="value.systemLabels || []"
              :toggle-filter="toggler"
              :add-label="t('labels.addLabel')"
              :mode="mode"
              :read-allowed="false"
              :value-can-be-empty="true"
              @input="value.setInstanceLabels($event)"
            />
          </template>
        </Labels>
      </Tab>
    </Tabbed>
  </div>
</template>
