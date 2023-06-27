<script>
import Loading from '@shell/components/Loading';
import ResourceTable from '@shell/components/ResourceTable';

import { allHash } from '@shell/utils/promise';
import { HCI } from '../types';
import { STATE, NAME } from '@shell/config/table-headers';

export default {
  name: 'ListHarvesterAddons',

  components: {
    ResourceTable,
    Loading,
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;

    await allHash({ addons: this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.ADD_ONS }) });
  },

  computed: {
    rows() {
      const inStore = this.$store.getters['currentProduct'].inStore;

      const addons = this.$store.getters[`${ inStore }/all`](HCI.ADD_ONS);

      return addons;
    },

    headers() {
      return [
        STATE,
        NAME,
        {
          name:          'description',
          labelKey:      'tableHeaders.description',
          value:         'metadata.name',
          align:         'left',
          sort:          ['status.description'],
          formatter:     'Translate',
          formatterOpts: { prefix: 'harvester.addons.descriptions' },
        },
      ];
    },

    schema() {
      const inStore = this.$store.getters['currentProduct'].inStore;

      return this.$store.getters[`${ inStore }/schemaFor`](HCI.ADD_ONS);
    },
  },
};
</script>

<template>
  <div>
    <Loading v-if="$fetchState.pending" />
    <ResourceTable
      :rows="rows"
      :groupable="false"
      :namespaced="false"
      :schema="schema"
      :headers="headers"
    >
      <template slot="cell:name" slot-scope="scope">
        <div class="cell-name">
          <LinkDetail v-model="scope.row.displayName" :row="scope.row" />

          <a
            v-if="scope.row.metadata.name === 'rancher-vcluster' && scope.row.spec.enabled"
            v-tooltip="t('harvester.addons.rancherVcluster.accessRancher')"
            class="ml-5"
            rel="nofollow noopener noreferrer"
            target="_blank"
            :href="scope.row.rancherHostname"
          >
            <i class="icon icon-external-link" />
          </a>
        </div>
      </template>
    </ResourceTable>
  </div>
</template>

<style lang="scss" scoped>
::v-deep .sortable-table TD .badge-state {
    max-width: 250px;
    text-overflow: clip;
  }

::v-deep .cell-name {
  white-space: nowrap;
}
</style>
