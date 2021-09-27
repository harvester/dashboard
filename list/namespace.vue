<script>
import { mapGetters } from 'vuex';
import ResourceTable from '@/components/ResourceTable';
import { FLEET } from '@/config/labels-annotations';
import { get } from '@/utils/object';

export default {
  name:       'ListNamespace',
  components: { ResourceTable },
  props:      {
    schema: {
      type:     Object,
      required: true,
    },
    rows: {
      type:     Array,
      required: true,
    },
  },

  computed: {
    ...mapGetters(['isVirtualCluster']),

    filterRow() {
      if (this.isVirtualCluster) {
        return this.rows.filter( (N) => {
          const isFleets = get(N, `metadata.labels."${ FLEET.MANAGED }"`) === 'true';

          return !N.isSystem && !isFleets;
        });
      } else {
        return this.rows;
      }
    },
  }
};
</script>

<template>
  <ResourceTable
    v-bind="$attrs"
    :rows="filterRow"
    :groupable="false"
    :schema="schema"
    key-field="_key"
    v-on="$listeners"
  />
</template>
