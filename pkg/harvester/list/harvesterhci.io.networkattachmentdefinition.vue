<script>
import { Banner } from '@components/Banner';
import Loading from '@shell/components/Loading';
import ResourceTable from '@shell/components/ResourceTable';
import BadgeState from '@shell/components/formatter/BadgeStateFormatter';

import { NAME, AGE, NAMESPACE, STATE } from '@shell/config/table-headers';
import { NETWORK_ATTACHMENT, SCHEMA } from '@shell/config/types';
import { HCI as HCI_ANNOTATIONS } from '../config/labels-annotations';
import { HCI } from '../types';

import { allHash } from '@shell/utils/promise';

const schema = {
  id:         HCI.NETWORK_ATTACHMENT,
  type:       SCHEMA,
  attributes: {
    kind:       HCI.NETWORK_ATTACHMENT,
    namespaced: true
  },
  metadata: { name: HCI.NETWORK_ATTACHMENT },
};

export const NETWORK_HEADERS = [
  NAME,
  NAMESPACE,
  {
    name:     'type',
    value:    'vlanType',
    sort:     'spec.config',
    labelKey: 'tableHeaders.networkType'
  },
  {
    name:     'vlan',
    value:    'vlanId',
    sort:     'spec.config',
    labelKey: 'tableHeaders.networkVlan'
  },
  {
    name:          'connectivity',
    value:         'connectivity',
    labelKey:      'tableHeaders.routeConnectivity',
    formatter:     'BadgeStateFormatter',
    formatterOpts: { arbitrary: true },
    width:         130,
  },
  AGE
];

export default {
  name:       'HarvesterListNetworks',
  components: {
    ResourceTable,
    Banner,
    Loading,
    BadgeState,
  },

  async fetch() {
    const currentCluster = this.$store.getters['currentCluster'];
    const storeName = currentCluster.isHarvester ? 'harvester' : 'cluster';

    const _hash = { rows: this.$store.dispatch(`${ storeName }/findAll`, { type: NETWORK_ATTACHMENT }) };

    if (this.$store.getters[`${ storeName }/schemaFor`](HCI.NODE_NETWORK)) {
      _hash.hostNetworks = this.$store.dispatch(`${ storeName }/findAll`, { type: HCI.NODE_NETWORK });
    }

    if (this.$store.getters[`${ storeName }/schemaFor`](HCI.CLUSTER_NETWORK)) {
      _hash.clusterNetworks = this.$store.dispatch(`${ storeName }/findAll`, { type: HCI.CLUSTER_NETWORK });
    }

    const hash = await allHash(_hash);

    this.rows = hash.rows;
    this.hostNetworks = hash.hostNetworks || [];
  },

  data() {
    return {
      hash:         {},
      rows:         [],
      hosts:        [],
      hostNetworks: [],
    };
  },

  computed: {
    headers() {
      return [
        STATE,
        NAME,
        NAMESPACE,
        {
          name:     'type',
          value:    'vlanType',
          sort:     'spec.config',
          labelKey: 'tableHeaders.networkType'
        },
        {
          name:     'clusterNetwork',
          value:    'clusterNetwork',
          sort:     'clusterNetwork',
          labelKey: 'harvester.network.clusterNetwork.label'
        },
        {
          name:     'vlan',
          value:    'vlanId',
          sort:     'spec.config',
          labelKey: 'tableHeaders.networkVlan'
        },
        {
          name:          'connectivity',
          value:         'connectivity',
          labelKey:      'tableHeaders.routeConnectivity',
          formatter:     'NetworkRouteConnectivity',
          formatterOpts: { arbitrary: true },
          width:         130,
        },
        AGE
      ];
    },

    schema() {
      return schema;
    },

    abnormalNetwork() {
      const notReadyCrd = this.hostNetworks.filter( O => !O.isReady);

      return notReadyCrd.map( O => O.linkMessage);
    },

    filterRows() {
      return this.rows.filter((row) => {
        return !row.metadata?.annotations?.[HCI_ANNOTATIONS.STORAGE_NETWORK];
      });
    }
  },

  typeDisplay() {
    return this.$store.getters['type-map/labelFor'](schema, 99);
  },
};
</script>

<template>
  <Loading v-if="$fetchState.pending" />
  <div v-else>
    <template v-if="abnormalNetwork.length">
      <Banner
        v-for="item in abnormalNetwork"
        :key="item.name"
        color="error"
      >
        <nuxt-link :to="item.to">
          {{ item.name }}:
        </nuxt-link>
        {{ item.message }}
      </Banner>
    </template>

    <ResourceTable
      v-bind="$attrs"
      :headers="headers"
      default-sort-by="age"
      :schema="schema"
      :groupable="true"
      :rows="filterRows"
      key-field="_key"
      v-on="$listeners"
    >
      <template #cell:state="{row}">
        <div class="state">
          <BadgeState
            :row="row"
          />
          <v-popover
            v-if="row.clusterNetworkErrorMessage"
            trigger="hover"
            offset="16"
          >
            <span class="tooltip-target">
              <i class="icon icon-warning icon-lg text-warning" />
            </span>

            <template slot="popover">
              <p>
                {{ row.clusterNetworkErrorMessage }}
              </p>
            </template>
          </v-popover>
        </div>
      </template>
    </ResourceTable>
  </div>
</template>

<style lang="scss" scoped>
.state {
  display: flex;
  justify-content: space-between;

  .icon-warning {
    margin-top: 2px;
  }
}
</style>
