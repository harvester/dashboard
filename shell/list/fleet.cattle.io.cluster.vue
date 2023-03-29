<script>
import FleetClusters from '@shell/components/fleet/FleetClusters';
import { FLEET, MANAGEMENT } from '@shell/config/types';
import ResourceFetch from '@shell/mixins/resource-fetch';

export default {
  name:       'ListCluster',
  components: { FleetClusters },
  mixins:     [ResourceFetch],
  props:      {
    resource: {
      type:     String,
      required: true,
    },
    schema: {
      type:     Object,
      required: true,
    },
    useQueryParamsForSimpleFiltering: {
      type:    Boolean,
      default: false
    }
  },

  async fetch() {
    this.$initializeFetchData(this.resource);

    this.$fetchType(FLEET.WORKSPACE);
    await this.$fetchType(this.resource);
    this.allMgmt = await this.$fetchType(MANAGEMENT.CLUSTER);
  },

  data() {
    return { allMgmt: [] };
  },

  computed: {
    allClusters() {
      const out = this.rows.slice();

      const known = {};

      for ( const c of out ) {
        known[c.metadata.name] = true;
      }

      for ( const c of this.allMgmt ) {
        if ( !known[c.metadata.name] ) {
          out.push(c);
        }
      }

      return out;
    },

    filteredRows() {
      return this.fleetClusters;
    },

    fleetClusters() {
      return this.allClusters.filter(c => c.type === FLEET.CLUSTER);
    },
  },
  // override with relevant info for the loading indicator since this doesn't use it's own masthead
  $loadingResources() {
    return {
      loadResources:     [FLEET.CLUSTER],
      loadIndeterminate: true, // results are filtered so we wouldn't get the correct count on indicator...
    };
  },
};
</script>

<template>
  <div>
    <FleetClusters
      :rows="filteredRows"
      :schema="schema"
      :loading="loading"
      :use-query-params-for-simple-filtering="useQueryParamsForSimpleFiltering"
      :force-update-live-and-delayed="forceUpdateLiveAndDelayed"
    />
  </div>
</template>
