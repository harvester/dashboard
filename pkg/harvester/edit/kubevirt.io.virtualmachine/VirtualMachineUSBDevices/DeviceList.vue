<script>
import ResourceTable from '@shell/components/ResourceTable';
import { HCI } from '../../../types';
import { STATE, SIMPLE_NAME } from '@shell/config/table-headers';
import { defaultTableSortGenerationFn } from '@shell/components/ResourceTable.vue';

export default {
  name: 'ListUsbDevices',

  components: { ResourceTable },

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

    await this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.USB_CLAIM });
  },

  data() {
    const isSingleProduct = this.$store.getters['isSingleProduct'];

    // TODO add new column
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
        name:  'pciAddress',
        label: 'Address',
        value: 'status.pciAddress',
        sort:  ['status.pciAddress']
      },
      {
        name:  'vendorID',
        label: 'Vendor ID',
        value: 'status.vendorID',
        sort:  ['status.vendorID', 'status.productID']
      },
      {
        name:  'productID',
        label: 'Product ID',
        value: 'status.productID',
        sort:  ['status.productID', 'status.vendorID']
      },
    ];

    if (!isSingleProduct) {
      headers.push( {
        name:  'claimed',
        label: 'Claimed By',
        value: 'claimedBy',
        sort:  ['claimedBy'],
      });
    }

    return {
      headers,
      rows:       [],
      filterRows: []
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

    changeRows(filterRows) {
      this.$set(this, 'filterRows', filterRows);
    },

    sortGenerationFn() {
      let base = defaultTableSortGenerationFn(this.schema, this.$store);

      if (this.parentSriov) {
        base += this.parentSriov;
      }

      return base;
    },
  },

  typeDisplay() {
    return this.t('harvester.usb.label');
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
          {{ t('harvester.usb.disableGroup') }}
        </button>
        <button v-else type="button" class="btn btn-sm role-secondary mr-5" @click="e=>{enableGroup(group.rows); e.target.blur()}">
          {{ t('harvester.usb.enableGroup') }}
        </button>
        <span v-clean-html="group.key" />
      </div>
    </template>
    <template #cell:claimed="{row}">
      <span v-if="row.status.enabled">{{ row.claimedBy }}</span>
      <span v-else class="text-muted">&mdash;</span>
    </template>
  </ResourceTable>
</template>
