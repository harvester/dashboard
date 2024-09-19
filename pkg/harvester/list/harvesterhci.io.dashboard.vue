<script>
import dayjs from 'dayjs';
import minMax from 'dayjs/plugin/minMax';
import utc from 'dayjs/plugin/utc';
import { mapGetters } from 'vuex';
import Loading from '@shell/components/Loading';
import Banner from '@components/Banner/Banner.vue';
import MessageLink from '@shell/components/MessageLink';
import SortableTable from '@shell/components/SortableTable';
import { allHash, setPromiseResult } from '@shell/utils/promise';
import {
  parseSi, formatSi, exponentNeeded, UNITS, createMemoryValues
} from '@shell/utils/units';
import { REASON } from '@shell/config/table-headers';
import {
  EVENT, METRIC, NODE, SERVICE, PVC, LONGHORN, POD, COUNT, NETWORK_ATTACHMENT
} from '@shell/config/types';
import { HCI } from '../types';
import ResourceSummary, { resourceCounts, colorToCountName } from '@shell/components/ResourceSummary';
import { colorForState } from '@shell/plugins/dashboard-store/resource-class';
import HardwareResourceGauge from '@shell/components/HardwareResourceGauge';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import DashboardMetrics from '@shell/components/DashboardMetrics';
import metricPoller from '@shell/mixins/metric-poller';
import { allDashboardsExist } from '@shell/utils/grafana';
import { isEmpty } from '@shell/utils/object';
import HarvesterUpgrade from '../components/HarvesterUpgrade';
import { PRODUCT_NAME as HARVESTER_PRODUCT } from '../config/harvester';

dayjs.extend(utc);
dayjs.extend(minMax);

const PARSE_RULES = {
  memory: {
    format: {
      addSuffix:        true,
      firstSuffix:      'B',
      increment:        1024,
      maxExponent:      99,
      maxPrecision:     2,
      minExponent:      0,
      startingExponent: 0,
      suffix:           'iB',
    }
  }
};

const RESOURCES = [{
  type:    NODE,
  spoofed: {
    location: {
      name:   `${ HARVESTER_PRODUCT }-c-cluster-resource`,
      params: { resource: HCI.HOST }
    },
    name: HCI.HOST,
  }
},
{
  type:    HCI.VM,
  spoofed: {
    location: {
      name:   `${ HARVESTER_PRODUCT }-c-cluster-resource`,
      params: { resource: HCI.VM }
    },
    name: HCI.VM,
  }
},
{
  type:    NETWORK_ATTACHMENT,
  spoofed: {
    location: {
      name:   `${ HARVESTER_PRODUCT }-c-cluster-resource`,
      params: { resource: HCI.NETWORK_ATTACHMENT }
    },
    name:            HCI.NETWORK_ATTACHMENT,
    filterNamespace: ['harvester-system']
  }
},
{
  type:    HCI.IMAGE,
  spoofed: {
    location: {
      name:   `${ HARVESTER_PRODUCT }-c-cluster-resource`,
      params: { resource: HCI.IMAGE }
    },
    name: HCI.IMAGE,
  }
},
{
  type:    PVC,
  spoofed: {
    location: {
      name:   `${ HARVESTER_PRODUCT }-c-cluster-resource`,
      params: { resource: HCI.VOLUME }
    },
    name:            HCI.VOLUME,
    filterNamespace: ['cattle-monitoring-system']
  }
},
{
  type:    HCI.BLOCK_DEVICE,
  spoofed: {
    location: {
      name:   `${ HARVESTER_PRODUCT }-c-cluster-resource`,
      params: { resource: HCI.HOST }
    },
    name: HCI.BLOCK_DEVICE,
  },
}];

const CLUSTER_METRICS_DETAIL_URL = '/api/v1/namespaces/cattle-monitoring-system/services/http:rancher-monitoring-grafana:80/proxy/d/rancher-cluster-nodes-1/rancher-cluster-nodes?orgId=1';
const CLUSTER_METRICS_SUMMARY_URL = '/api/v1/namespaces/cattle-monitoring-system/services/http:rancher-monitoring-grafana:80/proxy/d/rancher-cluster-1/rancher-cluster?orgId=1';
const VM_DASHBOARD_METRICS_URL = '/api/v1/namespaces/cattle-monitoring-system/services/http:rancher-monitoring-grafana:80/proxy/d/harvester-vm-dashboard-1/vm-dashboard?orgId=1';

const MONITORING_ID = 'cattle-monitoring-system/rancher-monitoring';

export default {
  mixins:     [metricPoller],
  components: {
    Loading,
    HardwareResourceGauge,
    SortableTable,
    HarvesterUpgrade,
    ResourceSummary,
    Tabbed,
    Tab,
    DashboardMetrics,
    Banner,
    MessageLink,
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;

    const hash = {
      vms:              this.fetchClusterResources(HCI.VM),
      nodes:            this.fetchClusterResources(NODE),
      events:           this.fetchClusterResources(EVENT),
      metricNodes:      this.fetchClusterResources(METRIC.NODE),
      settings:         this.fetchClusterResources(HCI.SETTING),
      services:         this.fetchClusterResources(SERVICE),
      metric:           this.fetchClusterResources(METRIC.NODE),
      longhornNodes:    this.fetchClusterResources(LONGHORN.NODES),
      longhornSettings: this.fetchClusterResources(LONGHORN.SETTINGS),
      _pods:            this.$store.dispatch('harvester/findAll', { type: POD }),
    };

    (this.accessibleResources || []).map((a) => {
      hash[a.type] = this.$store.dispatch(`${ inStore }/findAll`, { type: a.type });

      return null;
    });

    if (this.$store.getters[`${ inStore }/schemaFor`](HCI.ADD_ONS)) {
      hash.addons = this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.ADD_ONS });
    }

    if (this.$store.getters[`${ inStore }/schemaFor`](LONGHORN.NODES)) {
      this.hasLonghornSchema = true;
    }

    const res = await allHash(hash);

    for ( const k in res ) {
      this[k] = res[k];
    }

    setPromiseResult(
      allDashboardsExist(this.$store, this.currentCluster.id, [CLUSTER_METRICS_DETAIL_URL, CLUSTER_METRICS_SUMMARY_URL], 'harvester'),
      this,
      'showClusterMetrics',
      'Determine cluster metrics'
    );
    setPromiseResult(
      allDashboardsExist(this.$store, this.currentCluster.id, [VM_DASHBOARD_METRICS_URL], 'harvester'),
      this,
      'showVmMetrics',
      'Determine vm metrics'
    );

    const addons = this.$store.getters[`${ inStore }/all`](HCI.ADD_ONS);

    this.monitoring = addons.find(addon => addon.id === MONITORING_ID);
    this.enabledMonitoringAddon = this.monitoring?.spec?.enabled;
  },

  data() {
    const reason = {
      ...REASON,
      ...{ canBeVariable: true },
      width: 130
    };

    const eventHeaders = [
      reason,
      {
        name:          'resource',
        label:         'Resource',
        labelKey:      'clusterIndexPage.sections.events.resource.label',
        value:         'displayInvolvedObject',
        sort:          ['involvedObject.kind', 'involvedObject.name'],
        canBeVariable: true,
      },
      {
        align:         'right',
        name:          'date',
        label:         'Date',
        labelKey:      'clusterIndexPage.sections.events.date.label',
        value:         'lastTimestamp',
        sort:          'lastTimestamp:desc',
        formatter:     'LiveDate',
        formatterOpts: { addSuffix: true },
        width:         125,
        defaultSort:   true,
      },
    ];

    return {
      eventHeaders,
      constraints:            [],
      events:                 [],
      nodeMetrics:            [],
      nodes:                  [],
      metricNodes:            [],
      vms:                    [],
      monitoring:             {},
      VM_DASHBOARD_METRICS_URL,
      CLUSTER_METRICS_SUMMARY_URL,
      CLUSTER_METRICS_DETAIL_URL,
      showClusterMetrics:     false,
      showVmMetrics:          false,
      enabledMonitoringAddon: false,
      hasLonghornSchema:      false,
    };
  },

  computed: {
    ...mapGetters(['currentCluster']),

    accessibleResources() {
      const inStore = this.$store.getters['currentProduct'].inStore;

      return RESOURCES.filter(resource => this.$store.getters[`${ inStore }/schemaFor`](resource.type));
    },

    totalCountGaugeInput() {
      const out = {};

      this.accessibleResources.forEach((resource) => {
        const counts = resourceCounts(this.$store, resource.type);

        out[resource.type] = { resource: resource.type };

        Object.entries(counts).forEach((entry) => {
          out[resource.type][entry[0]] = entry[1];
        });

        if (resource.spoofed) {
          if (resource.spoofed?.filterNamespace && Array.isArray(resource.spoofed.filterNamespace)) {
            const clusterCounts = this.$store.getters['harvester/all'](COUNT)[0].counts;
            const statistics = clusterCounts[resource.type] || {};

            for (let i = 0; i < resource.spoofed.filterNamespace.length; i++) {
              const nsStatistics = statistics?.namespaces?.[resource.spoofed.filterNamespace[i]] || {};

              if (nsStatistics.count) {
                out[resource.type]['useful'] -= nsStatistics.count;
                out[resource.type]['total'] -= nsStatistics.count;
              }
              Object.entries(nsStatistics?.states || {}).forEach((entry) => {
                const color = colorForState(entry[0]);
                const count = entry[1];
                const countName = colorToCountName(color);

                out[resource.type]['useful'] -= count;
                out[resource.type][countName] += count;
              });
            }
          }

          out[resource.type] = {
            ...out[resource.type],
            ...resource.spoofed,
            isSpoofed: true
          };

          out[resource.type].name = this.t(`typeLabel."${ resource.spoofed.name }"`, { count: out[resource.type].total });
        }

        if (resource.type === HCI.BLOCK_DEVICE) {
          let total = 0;
          let errorCount = 0;

          (this.nodes || []).map((node) => {
            total += node.diskStatusCount.total;
            errorCount += node.diskStatusCount.errorCount;
          });

          out[resource.type] = {
            ...out[resource.type],
            total,
            errorCount,
            useful: total - errorCount,
          };
        }
      });

      return out;
    },

    currentVersion() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const setting = this.$store.getters[`${ inStore }/byId`](HCI.SETTING, 'server-version');

      return setting?.value || setting?.default;
    },

    firstNodeCreationTimestamp() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const days = this.$store.getters[`${ inStore }/all`](NODE).map( (N) => {
        return dayjs(N.metadata.creationTimestamp);
      });

      if (!days.length) {
        return dayjs().utc().format();
      }

      return dayjs.min(days).utc().format();
    },

    cpusTotal() {
      let out = 0;

      this.metricNodes.forEach((node) => {
        out += node.cpuCapacity;
      });

      return out;
    },

    cpusUsageTotal() {
      let out = 0;

      this.metricNodes.forEach((node) => {
        out += node.cpuUsage;
      });

      return out;
    },

    memoryTotal() {
      let out = 0;

      this.metricNodes.forEach((node) => {
        out += node.memoryCapacity;
      });

      return out;
    },

    memoryUsageTotal() {
      let out = 0;

      this.metricNodes.forEach((node) => {
        out += node.memoryUsage;
      });

      return out;
    },

    storageStats() {
      const storageOverProvisioningPercentageSetting = this.longhornSettings.find(s => s.id === 'longhorn-system/storage-over-provisioning-percentage');
      const stats = this.longhornNodes.reduce((total, node) => {
        const disks = node?.spec?.disks || {};
        const diskStatus = node?.status?.diskStatus || {};

        total.used += node?.spec?.allowScheduling ? node.used : 0;

        Object.keys(disks).map((key) => {
          total.scheduled += node?.spec?.allowScheduling ? (diskStatus[key]?.storageScheduled || 0) : 0;
          total.reserved += disks[key]?.storageReserved || 0;
        });
        Object.values(diskStatus).map((diskStat) => {
          total.maximum += diskStat?.storageMaximum || 0;
        });

        return total;
      }, {
        used:      0,
        scheduled: 0,
        maximum:   0,
        reserved:  0,
        total:     0
      });

      stats.total = ((stats.maximum - stats.reserved) * Number(storageOverProvisioningPercentageSetting?.value ?? 0)) / 100;

      return stats;
    },

    storageUsed() {
      const stats = this.storageStats;

      return this.createMemoryValues(stats.maximum, stats.used);
    },

    storageAllocated() {
      const stats = this.storageStats;

      return this.createMemoryValues(stats.total, stats.scheduled);
    },

    vmEvents() {
      return this.events.filter( E => ['VirtualMachineInstance', 'VirtualMachine'].includes(E.involvedObject.kind));
    },

    volumeEvents() {
      return this.events.filter( E => ['PersistentVolumeClaim'].includes(E.involvedObject.kind));
    },

    hostEvents() {
      return this.events.filter( E => ['Node'].includes(E.involvedObject.kind));
    },

    imageEvents() {
      return this.events.filter( E => ['VirtualMachineImage'].includes(E.involvedObject.kind));
    },

    hasMetricsTabs() {
      return this.showClusterMetrics || this.showVmMetrics;
    },

    pods() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const pods = this.$store.getters[`${ inStore }/all`](POD) || [];

      return pods.filter(p => p?.metadata?.name !== 'removing');
    },

    cpuReserved() {
      const useful = this.nodes.reduce((total, node) => {
        return total + node.cpuReserved;
      }, 0);

      return {
        total: this.cpusTotal,
        useful,
      };
    },

    ramReserved() {
      const useful = this.nodes.reduce((total, node) => {
        return total + node.memoryReserved;
      }, 0);

      return createMemoryValues(this.memoryTotal, useful);
    },

    availableNodes() {
      return (this.metricNodes || []).map(node => node.id);
    },

    metricAggregations() {
      const nodes = this.nodes;
      const someNonWorkerRoles = this.nodes.some(node => node.hasARole && !node.isWorker);
      const metrics = this.nodeMetrics.filter((nodeMetrics) => {
        const node = nodes.find(nd => nd.id === nodeMetrics.id);

        return node && (!someNonWorkerRoles || node.isWorker);
      });
      const initialAggregation = {
        cpu:    0,
        memory: 0
      };

      if (isEmpty(metrics)) {
        return null;
      }

      return metrics.reduce((agg, metric) => {
        agg.cpu += parseSi(metric.usage.cpu);
        agg.memory += parseSi(metric.usage.memory);

        return agg;
      }, initialAggregation);
    },

    cpuUsed() {
      return {
        total:  this.cpusTotal,
        useful: this.metricAggregations?.cpu,
      };
    },

    ramUsed() {
      return createMemoryValues(this.memoryTotal, this.metricAggregations?.memory);
    },

    hasMetricNodeSchema() {
      const inStore = this.$store.getters['currentProduct'].inStore;

      return !!this.$store.getters[`${ inStore }/schemaFor`](METRIC.NODE);
    },

    toEnableMonitoringAddon() {
      return `${ HCI.ADD_ONS }/cattle-monitoring-system/rancher-monitoring?mode=edit#alertmanager`;
    },

    canEnableMonitoringAddon() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const hasSchema = this.$store.getters[`${ inStore }/schemaFor`](HCI.ADD_ONS);

      return hasSchema && this.monitoring;
    },
  },

  methods: {
    createMemoryValues(total, useful) {
      const parsedTotal = parseSi((total || '0').toString());
      const parsedUseful = parseSi((useful || '0').toString());
      const format = this.createMemoryFormat(parsedTotal);
      const formattedTotal = formatSi(parsedTotal, format);
      let formattedUseful = formatSi(parsedUseful, {
        ...format,
        addSuffix: false,
      });

      if (!Number.parseFloat(formattedUseful) > 0) {
        formattedUseful = formatSi(parsedUseful, {
          ...format,
          canRoundToZero: false,
        });
      }

      return {
        total:  Number(parsedTotal),
        useful: Number(parsedUseful),
        formattedTotal,
        formattedUseful,
        units:  this.createMemoryUnits(parsedTotal),
      };
    },

    createMemoryFormat(n) {
      const exponent = exponentNeeded(n, PARSE_RULES.memory.format.increment);

      return {
        ...PARSE_RULES.memory.format,
        maxExponent: exponent,
        minExponent: exponent,
      };
    },

    createMemoryUnits(n) {
      const exponent = exponentNeeded(n, PARSE_RULES.memory.format.increment);

      return `${ UNITS[exponent] }${ PARSE_RULES.memory.format.suffix }`;
    },

    async fetchClusterResources(type, opt = {}, store) {
      const inStore = store || this.$store.getters['currentProduct'].inStore;

      const schema = this.$store.getters[`${ inStore }/schemaFor`](type);

      if (schema) {
        try {
          const resources = await this.$store.dispatch(`${ inStore }/findAll`, { type, opt });

          return resources;
        } catch (err) {
          console.error(`Failed fetching cluster resource ${ type } with error:`, err); // eslint-disable-line no-console

          return [];
        }
      }

      return [];
    },

    async loadMetrics() {
      this.nodeMetrics = await this.fetchClusterResources(METRIC.NODE, { force: true } );
    },
  }
};
</script>

<template>
  <Loading v-if="$fetchState.pending || !currentCluster" />
  <section v-else>
    <HarvesterUpgrade />

    <div
      class="cluster-dashboard-glance"
    >
      <div>
        <label>
          {{ t('harvester.dashboard.version') }}:
        </label>
        <span>
          <span v-clean-tooltip="{content: currentVersion}">
            {{ currentVersion }}
          </span>
        </span>
      </div>
      <div>
        <label>
          {{ t('glance.created') }}:
        </label>
        <span>
          <LiveDate
            :value="firstNodeCreationTimestamp"
            :add-suffix="true"
            :show-tooltip="true"
          />
        </span>
      </div>
    </div>

    <div v-if="!enabledMonitoringAddon && canEnableMonitoringAddon">
      <Banner color="info">
        <MessageLink
          :to="toEnableMonitoringAddon"
          prefix-label="harvester.monitoring.alertmanagerConfig.disabledAddon.prefix"
          middle-label="harvester.monitoring.alertmanagerConfig.disabledAddon.middle"
          suffix-label="harvester.monitoring.alertmanagerConfig.disabledAddon.suffix"
        />
      </Banner>
    </div>

    <div class="resource-gauges">
      <ResourceSummary
        v-for="resource in totalCountGaugeInput"
        :key="resource.resource"
        :spoofed-counts="resource.isSpoofed ? resource : null"
        :resource="resource.resource"
      />
    </div>

    <template v-if="nodes.length && hasMetricNodeSchema">
      <h3 class="mt-40">
        {{ t('clusterIndexPage.sections.capacity.label') }}
      </h3>
      <div
        class="hardware-resource-gauges"
        :class="{
          live: !hasLonghornSchema,
        }"
      >
        <HardwareResourceGauge
          :name="t('harvester.dashboard.hardwareResourceGauge.cpu')"
          :reserved="cpuReserved"
          :used="cpuUsed"
        />
        <HardwareResourceGauge
          :name="t('harvester.dashboard.hardwareResourceGauge.memory')"
          :reserved="ramReserved"
          :used="ramUsed"
        />
        <HardwareResourceGauge
          v-if="hasLonghornSchema"
          :name="t('harvester.dashboard.hardwareResourceGauge.storage')"
          :used="storageUsed"
          :reserved="storageAllocated"
          :reserved-title="t('harvester.dashboard.hardwareResourceGauge.allocated')"
        />
      </div>
    </template>

    <Tabbed
      v-if="hasMetricsTabs && enabledMonitoringAddon"
      class="mt-30"
    >
      <Tab
        v-if="showClusterMetrics"
        name="cluster-metrics"
        :label="t('clusterIndexPage.sections.clusterMetrics.label')"
        :weight="99"
      >
        <template #default="props">
          <DashboardMetrics
            v-if="props.active"
            :detail-url="CLUSTER_METRICS_DETAIL_URL"
            :summary-url="CLUSTER_METRICS_SUMMARY_URL"
            graph-height="825px"
          />
        </template>
      </Tab>
      <Tab
        v-if="showVmMetrics"
        name="vm-metric"
        :label="t('harvester.dashboard.sections.vmMetrics.label')"
        :weight="98"
      >
        <template #default="props">
          <DashboardMetrics
            v-if="props.active"
            :detail-url="VM_DASHBOARD_METRICS_URL"
            graph-height="825px"
            :has-summary-and-detail="false"
          />
        </template>
      </Tab>
    </Tabbed>

    <div class="mb-40 mt-40">
      <h3>
        {{ t('clusterIndexPage.sections.events.label') }}
      </h3>
      <Tabbed class="mt-20">
        <Tab
          name="host"
          label="Hosts"
          :weight="98"
        >
          <SortableTable
            :rows="hostEvents"
            :headers="eventHeaders"
            key-field="id"
            :search="false"
            :table-actions="false"
            :row-actions="false"
            :paging="true"
            :rows-per-page="10"
            default-sort-by="date"
          >
            <template #cell:resource="{row, value}">
              <div class="text-info">
                {{ value }}
              </div>
              <div v-if="row.message">
                {{ row.displayMessage }}
              </div>
            </template>
          </SortableTable>
        </Tab>
        <Tab
          name="vm"
          label="VMs"
          :weight="99"
        >
          <SortableTable
            :rows="vmEvents"
            :headers="eventHeaders"
            key-field="id"
            :search="false"
            :table-actions="false"
            :row-actions="false"
            :paging="true"
            :rows-per-page="10"
            default-sort-by="date"
          >
            <template #cell:resource="{row, value}">
              <div class="text-info">
                {{ value }}
              </div>
              <div v-if="row.message">
                {{ row.displayMessage }}
              </div>
            </template>
          </SortableTable>
        </Tab>
        <Tab
          name="volume"
          label="Volumes"
          :weight="97"
        >
          <SortableTable
            :rows="volumeEvents"
            :headers="eventHeaders"
            key-field="id"
            :search="false"
            :table-actions="false"
            :row-actions="false"
            :paging="true"
            :rows-per-page="10"
            default-sort-by="date"
          >
            <template #cell:resource="{row, value}">
              <div class="text-info">
                {{ value }}
              </div>
              <div v-if="row.message">
                {{ row.displayMessage }}
              </div>
            </template>
          </SortableTable>
        </Tab>
        <Tab
          name="image"
          label="Images"
          :weight="96"
        >
          <SortableTable
            :rows="imageEvents"
            :headers="eventHeaders"
            key-field="id"
            :search="false"
            :table-actions="false"
            :row-actions="false"
            :paging="true"
            :rows-per-page="10"
            default-sort-by="date"
          >
            <template #cell:resource="{row, value}">
              <div class="text-info">
                {{ value }}
              </div>
              <div v-if="row.message">
                {{ row.displayMessage }}
              </div>
            </template>
          </SortableTable>
        </Tab>
      </Tabbed>
    </div>
  </section>
</template>

<style lang="scss" scoped>
  .cluster-dashboard-glance {
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    padding: 20px 0px;
    display: flex;

    &>*{
      margin-right: 40px;

      & SPAN {
        font-weight: bold
      }
    }
  }

  .events {
    margin-top: 30px;
  }
</style>
