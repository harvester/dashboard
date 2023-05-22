<script>
import { HCI } from '@shell/config/types';

export default {
  props: {
    row: {
      type:     Object,
      required: true
    },
  },
  data(props) {
    return {
      // The isImported getter on the provisioning cluster
      // model doesn't work for imported K3s clusters, in
      // which case it returns 'k3s' instead of 'imported.'
      // This is the workaround.
      isImported: props.row.mgmt?.providerForEmberParam === 'import'
    };
  },

  methods: {
    async goToHarvesterCluster() {
      const harvesterCluster = await this.$store.dispatch('management/create', {
        ...this.row,
        type: HCI.CLUSTER
      });

      try {
        await harvesterCluster.goToCluster();
      } catch {
      }
    }
  }
};
</script>

<template>
  <div>
    <template v-if="row.machineProvider">
      {{ row.machineProviderDisplay }}
    </template>
    <template v-else-if="row.isCustom">
      {{ t('cluster.provider.custom') }}
    </template>
    <template v-else-if="isImported">
      {{ t('cluster.provider.imported') }}
    </template>
    <div class="text-muted">
      {{ row.provisionerDisplay }} <span v-if="row.isHarvester && row.mgmt">/
        <a
          v-if="row.mgmt.isReady && !row.hasError"
          role="button"
          @click="goToHarvesterCluster"
        >
          {{ t('cluster.provider.harvester') }}
        </a>
        <span v-else>
          {{ t('cluster.provider.harvester') }}
        </span>
      </span>
    </div>
  </div>
</template>
