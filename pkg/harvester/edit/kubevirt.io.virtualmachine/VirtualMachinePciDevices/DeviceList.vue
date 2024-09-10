<script>
import ResourceTable from '@shell/components/ResourceTable';
import FilterBySriov from '../../../components/FilterBySriov';
import { HCI } from '../../../types';
import { STATE, SIMPLE_NAME } from '@shell/config/table-headers';
import { defaultTableSortGenerationFn } from '@shell/components/ResourceTable.vue';
import { allHash } from '@shell/utils/promise';
import { HCI as HCI_ANNOTATIONS } from '@pkg/harvester/config/labels-annotations';

export default {
  name: 'ListPciDevices',

  components: { ResourceTable, FilterBySriov },

  props: {
    schema: {
      type:     Object,
      required: true,
    },

    devices: {
      type:     Array,
      required: true,
    },

  },
  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;
    const _hash = {
      pciclaims: this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.PCI_CLAIM }),
      sriovs:    this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.SR_IOV }),
    };

    await allHash(_hash);
  },

  data() {
    const isSingleProduct = this.$store.getters['isSingleProduct'];
    const headers = [
      { ...STATE },
      SIMPLE_NAME,
      {
        name:     'description',
        labelKey: 'tableHeaders.description',
        value:    'status.description',
        sort:     ['status.description']
      },
      {
        name:     'node',
        labelKey: 'tableHeaders.node',
        value:    'status.nodeName',
        sort:     ['status.nodeName']
      },
      {
        name:  'address',
        label: 'Address',
        value: 'status.address',
        sort:  ['status.address']
      },
      {
        name:  'vendorid',
        label: 'Vendor ID',
        value: 'status.vendorId',
        sort:  ['status.vendorId', 'status.deviceId']
      },
      {
        name:  'deviceid',
        label: 'Device ID',
        value: 'status.deviceId',
        sort:  ['status.deviceId', 'status.vendorId']
      },

    ];

    if (!isSingleProduct) {
      headers.push( {
        name:  'claimed',
        label: 'Claimed By',
        value: 'passthroughClaim.userName',
        sort:  ['passthroughClaim.userName'],
      });
    }

    return {
      headers,
      rows:        [],
      parentSriov: null,
      filterRows:  []
    };
  },

  watch: {
    devices: {
      handler(v) {
        this.rows = v;
        this.filterRows = this.rows;
      },
      immediate: true,
    },
  },

  computed: {
    parentSriovOptions() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const allSriovs = this.$store.getters[`${ inStore }/all`](HCI.SR_IOV) || [];

      return allSriovs.map((sriov) => {
        return sriov.id;
      });
    },
    parentSriovLabel() {
      return HCI_ANNOTATIONS.PARENT_SRIOV;
    }
  },

  methods: {
    enableGroup(rows = []) {
      const row = rows[0];

      if (row) {
        row.enablePassthroughBulk(rows);
      }
    },
    disableGroup(rows = []) {
      rows.forEach((row) => {
        if (row.passthroughClaim) {
          row.disablePassthrough();
        }
      });
    },
    groupIsAllEnabled(rows = []) {
      return !rows.find(device => !device.passthroughClaim);
    },

    changeRows(filterRows, parentSriov) {
      this.$set(this, 'filterRows', filterRows);
      this.$set(this, 'parentSriov', parentSriov);
    },

    sortGenerationFn() {
      let base = defaultTableSortGenerationFn(this.schema, this.$store);

      if (this.parentSriov) {
        base += this.parentSriov;
      }

      return base;
    },
  }
};
</script>

<template>
  <ResourceTable
    :headers="headers"
    :schema="schema"
    :rows="filterRows"
    :use-query-params-for-simple-filtering="true"
    :sort-generation-fn="sortGenerationFn"
    :rows-per-page="10"
  >
    <template #group-by="{group}">
      <div :ref="group.key" v-trim-whitespace class="group-tab">
        <button v-if="groupIsAllEnabled(group.rows)" type="button" class="btn btn-sm role-secondary mr-5" @click="e=>{disableGroup(group.rows); e.target.blur()}">
          {{ t('harvester.pci.disableGroup') }}
        </button>
        <button v-else type="button" class="btn btn-sm role-secondary mr-5" @click="e=>{enableGroup(group.rows); e.target.blur()}">
          {{ t('harvester.pci.enableGroup') }}
        </button>
        <span v-clean-html="group.key" />
      </div>
    </template>
    <template #cell:claimed="{row}">
      <span v-if="row.isEnabled">{{ row.claimedBy }}</span>
      <span v-else class="text-muted">&mdash;</span>
    </template>
    <template #more-header-middle>
      <FilterBySriov
        ref="filterByParentSRIOV"
        :parent-sriov-options="parentSriovOptions"
        :parent-sriov-label="parentSriovLabel"
        :label="t('harvester.sriov.parentSriov')"
        :rows="rows"
        @change-rows="changeRows"
      />
    </template>
  </ResourceTable>
</template>
