<script>
import ResourceTable from '@shell/components/ResourceTable';
import Loading from '@shell/components/Loading';
import { SECRET, SCHEMA } from '@shell/config/types';
import { HCI } from '../types';

const schema = {
  id:         HCI.SECRET,
  type:       SCHEMA,
  attributes: {
    kind:       HCI.SECRET,
    namespaced: true
  },
  metadata: { name: HCI.SECRET },
};

export default {
  name:       'HarvesterSecret',
  components: { ResourceTable, Loading },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;

    this.rows = await this.$store.dispatch(`${ inStore }/findAll`, { type: SECRET });

    const configSchema = this.$store.getters[`${ inStore }/schemaFor`](SECRET);

    if (!configSchema?.collectionMethods.find(x => x.toLowerCase() === 'post')) {
      this.$store.dispatch('type-map/configureType', { match: HCI.SECRET, isCreatable: false });
    }
  },

  data() {
    return { rows: [] };
  },

  computed: {
    schema() {
      return schema;
    }
  },

  typeDisplay() {
    return this.$store.getters['type-map/labelFor'](schema, 99);
  }
};
</script>

<template>
  <Loading v-if="$fetchState.pending" />
  <ResourceTable
    v-else
    v-bind="$attrs"
    :groupable="true"
    :schema="schema"
    :rows="rows"
    key-field="_key"
    v-on="$listeners"
  />
</template>
