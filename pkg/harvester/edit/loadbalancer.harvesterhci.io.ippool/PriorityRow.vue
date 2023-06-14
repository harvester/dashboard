<script>
import { _EDIT, _VIEW } from '@shell/config/query-params';
import Select from '@shell/components/form/Select';
import { MANAGEMENT, CAPI } from '@shell/config/types';
import { mapGetters } from 'vuex';
import { HCI } from '@pkg/harvester/types';

export default {
  components: { Select },

  props: {
    row: {
      type:    Object,
      default: () => ({}),
    },

    mode: {
      type:    String,
      default: _EDIT,
    },

    rows: {
      type:    Array,
      default: () => [],
    },

    idx: {
      type:     Number,
      required: true,
    },
  },

  data() {
    return { value: '' };
  },

  computed: {
    ...mapGetters(['allNamespaces', 'currentCluster', 'isRancherInHarvester', 'isStandaloneHarvester']),

    showProjectAndCluster() {
      return !this.isStandaloneHarvester;
    },

    isView() {
      return this.mode === _VIEW;
    },

    showRemove() {
      return !this.isView;
    },

    filteredNamespaces() {
      const namespaces = this.allNamespaces || [];

      return namespaces.filter((namespace) => {
        if (this.row.project === '*') {
          return true;
        } else if (this.row.project) {
          return namespace.project?.id === this.row.project;
        } else {
          return true;
        }
      });
    },

    namespaceOptions() {
      const out = (this.filteredNamespaces || []).map((namespace) => {
        return {
          label: namespace.metadata.name,
          value: namespace.id,
        };
      });

      return [{
        label: this.t('generic.all'),
        value: '*',
      }, ...out];
    },

    guestClusterOptions() {
      const clusters = this.$store.getters['management/all'](CAPI.RANCHER_CLUSTER);
      const configs = this.$store.getters['management/all'](HCI.HARVESTER_CONFIG);
      const selectedClusters = this.rows.map(row => row?.guestCluster);
      const filteredNamespaces = this.filteredNamespaces.map(n => n.id);

      const out = clusters.filter((c) => {
        const machinePools = c.spec?.rkeConfig?.machinePools || [];
        const machineConfigName = machinePools[0]?.machineConfigRef?.name;
        const config = configs.find(c => c.id === `fleet-default/${ machineConfigName }`);

        if (config) {
          const vmNamespace = config?.vmNamespace;

          if (this.row.namespace === '*' && filteredNamespaces.includes(vmNamespace)) {
            return true;
          } else {
            return vmNamespace === this.row.namespace && !selectedClusters.includes(c.id);
          }
        } else {
          return false;
        }
      }).map((cluster) => {
        return {
          label: cluster.nameDisplay,
          value: cluster.metadata.name,
        };
      });

      return [{
        label: this.t('generic.none'),
        value: '',
      }, {
        label: this.t('generic.all'),
        value: '*',
      }, ...out];
    },

    projectOptions() {
      const projects = this.$store.getters['management/all'](MANAGEMENT.PROJECT);

      const out = projects.filter(p => p.metadata.namespace === this.currentCluster.id).map((project) => {
        return {
          label: project.nameDisplay,
          value: project.id,
        };
      });

      return [{
        label: this.t('generic.none'),
        value: '',
      }, {
        label: this.t('generic.all'),
        value: '*',
      }, ...out];
    },
  },

  methods: {
    update() {
      const { namespace, project, guestCluster } = this.row;

      this.$emit('input', {
        namespace,
        project,
        guestCluster,
      });
    },

    remove() {
      this.$emit('remove');
    },
  },

  watch: {
    'row.project'() {
      if (this.row.namespace !== '*') {
        this.row.namespace = '';
      }

      if (this.row.guestCluster !== '*' || this.row.guestCluster !== '') {
        this.row.guestCluster = '';
      }
    },

    'row.namespace'() {
      if (this.row.guestCluster !== '*') {
        this.row.guestCluster = '';
      }
    },
  },
};
</script>

<template>
  <div
    class="pool-row"
    :class="{
      'show-project-and-cluster': showProjectAndCluster,
    }"
  >
    <div
      v-if="showProjectAndCluster"
      class="pool-project"
    >
      <span v-if="isView">
        {{ row.project }}
      </span>
      <Select
        v-else
        v-model="row.project"
        :options="projectOptions"
        @input="update"
      />
    </div>
    <div class="pool-namespace">
      <span v-if="isView">
        {{ row.namespace }}
      </span>
      <Select
        v-else
        v-model="row.namespace"
        :options="namespaceOptions"
        @input="update"
      />
    </div>
    <div
      v-if="showProjectAndCluster"
      class="pool-guestCluster"
    >
      <span v-if="isView">
        {{ row.guestCluster }}
      </span>
      <Select
        v-else
        v-model="row.guestCluster"
        :options="guestClusterOptions"
        @input="update"
      />
    </div>
    <div v-if="showRemove" class="remove">
      <button type="button" class="btn role-link" @click="remove(idx)">
        <t k="generic.remove" />
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .pool-row {
    display: grid;
    grid-column-gap: $column-gutter;
    margin-bottom: 10px;
    align-items: center;

    grid-template-columns: 40% 40% 15%;

    &.show-project-and-cluster {
      grid-template-columns: 25% 25% 25% 15%;
    }
  }
</style>
