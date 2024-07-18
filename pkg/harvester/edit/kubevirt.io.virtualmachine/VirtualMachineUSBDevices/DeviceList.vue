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

  methods: {
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
    <template #cell:claimed="{row}">
      <span v-if="row.isEnabled">{{ row.claimedBy }}</span>
      <span v-else class="text-muted">&mdash;</span>
    </template>
  </ResourceTable>
</template>
