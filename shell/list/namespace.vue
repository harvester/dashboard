<script>
import { mapGetters } from 'vuex';
<<<<<<< HEAD
import ResourceTable from '@shell/components/ResourceTable';

=======
import { NS_SNAPSHOT_QUOTA } from '../config/table-headers';
import ResourceTable from '@shell/components/ResourceTable';
import { HCI } from '@shell/config/types';
>>>>>>> b5455bcb (fix: separate used/allocated units)
export default {
  name:       'ListNamespace',
  components: { ResourceTable },
  props:      {
    resource: {
      type:     String,
      required: true,
    },
    schema: {
      type:     Object,
      required: true,
    },
    rows: {
      type:     Array,
      required: true,
    },
    loading: {
      type:     Boolean,
      required: false,
    },
    useQueryParamsForSimpleFiltering: {
      type:    Boolean,
      default: false
    }
  },
<<<<<<< HEAD
  data() {
    return { asddsa: true };
  },

  computed: {
    ...mapGetters(['currentProduct']),

=======

  computed: {
    ...mapGetters(['currentProduct']),
    hasHarvesterResourceQuotaSchema() {
      const inStore = this.$store.getters['currentProduct'].inStore;

      return !!this.$store.getters[`${ inStore }/schemaFor`](HCI.RESOURCE_QUOTA);
    },
    headers() {
      const headersFromSchema = this.$store.getters['type-map/headersFor'](this.schema);

      if (this.hasHarvesterResourceQuotaSchema) {
        headersFromSchema.splice(2, 0, NS_SNAPSHOT_QUOTA);
      }

      return headersFromSchema;
    },
>>>>>>> b5455bcb (fix: separate used/allocated units)
    filterRow() {
      if (this.currentProduct.hideSystemResources) {
        return this.rows.filter( (N) => {
          return !N.isSystem && !N.isFleetManaged;
        });
      } else {
        return this.rows;
      }
    },
  },

  $loadingResources() {
    return { loadIndeterminate: true };
  },
};
</script>

<template>
  <ResourceTable
    v-bind="$attrs"
    :rows="filterRow"
    :groupable="false"
<<<<<<< HEAD
=======
    :headers="headers"
>>>>>>> b5455bcb (fix: separate used/allocated units)
    :schema="schema"
    key-field="_key"
    :loading="loading"
    :use-query-params-for-simple-filtering="useQueryParamsForSimpleFiltering"
    v-on="$listeners"
  />
</template>
