<script>
import { STATE, AGE, SIMPLE_NAME } from '@shell/config/table-headers';
import { NODE } from '@shell/config/types';
import ResourceTable from '@shell/components/ResourceTable';

export default {
  name: 'ListHarvesterSRIOV',

  components: { ResourceTable },

  props: {
    schema: {
      type:     Object,
      required: true,
    },
    rows: {
      type:     Array,
      required: true,
    },
  },

  data() {
    const inStore = this.$store.getters['currentProduct'].inStore;

    return { hasNode: this.$store.getters[`${ inStore }/schemaFor`](NODE) };
  },

  computed: {
    headers() {
      const nodeCol = {
        name:      'node',
        label:     'Node',
        value:     'realNodeName',
        sort:      ['realNodeName'],
        formatter: 'CopyToClipboard',
        labelKey:  'tableHeaders.node'
      };

      const cols = [
        STATE,
        SIMPLE_NAME,
        {
          name:        'numVFs',
          label:       'Num VFs',
          sort:        ['spec.numVFs'],
          value:       'spec.numVFs',
          formatter:   'HarvesterVFsNum',
          align:       'center',
          labelKey:    'harvester.sriov.numVFs',
          dashIfEmpty: true,
        },
        {
          name:        'vfAddresses',
          label:       'VF Addresses',
          labelKey:    'harvester.sriov.vfAddresses',
          sort:        ['status.vfAddresses'],
          value:       'status.vfAddresses',
          formatter:   'HarvesterVFAddress',
          align:       'center',
          dashIfEmpty: true,
        },
        {
          ...AGE,
          sort: 'metadata.creationTimestamp:desc',
        }
      ];

      if (this.hasNode) {
        cols.splice(-1, 0, nodeCol);
      }

      return cols;
    },
  }
};
</script>

<template>
  <ResourceTable
    v-bind="$attrs"
    :groupable="false"
    :namespaced="false"
    :headers="headers"
    :schema="schema"
    :rows="rows"
    key-field="_key"
  />
</template>
