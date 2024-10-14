<script>
import Loading from '@shell/components/Loading';
import Masthead from '@shell/components/ResourceList/Masthead';
import ResourceTable from '@shell/components/ResourceTable';
import { HCI } from '../types';
import { SCHEMA } from '@shell/config/types';
import { allHash } from '@shell/utils/promise';
import FilterVMSchedule from '../components/FilterVMSchedule';
import { STATE, AGE, NAME, NAMESPACE } from '@shell/config/table-headers';
import { BACKUP_TYPE } from '../config/types';
import { defaultTableSortGenerationFn } from '@shell/components/ResourceTable.vue';

export const schema = {
  id:         HCI.VM_SNAPSHOT,
  type:       SCHEMA,
  attributes: {
    kind:       HCI.VM_SNAPSHOT,
    namespaced: true
  },
  metadata: { name: HCI.VM_SNAPSHOT },
};

export default {
  name:       'HarvesterListVMSnapshot',
  components: {
    ResourceTable, Loading, Masthead, FilterVMSchedule
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;
    const hash = await allHash({
      vms:  this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.VM }),
      rows: this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.BACKUP }),
    });

    const schema = this.$store.getters[`${ inStore }/schemaFor`](HCI.BACKUP);

    if (!schema?.collectionMethods.find(x => x.toLowerCase() === 'post')) {
      this.$store.dispatch('type-map/configureType', { match: HCI.VM_SNAPSHOT, isCreatable: false });
    }

    this.rows = hash.rows;
    this.snapshots = hash.rows;
  },

  data() {
    const params = { ...this.$route.params };

    const resource = params.resource;

    return {
      rows:           [],
      snapshots:      [],
      searchSchedule: '',
      resource,
    };
  },

  computed: {
    headers() {
      return [
        STATE,
        NAME,
        NAMESPACE,
        {
          name:      'targetVM',
          labelKey:  'harvester.tableHeaders.targetVm',
          value:     'attachVM',
          align:     'left',
          sort:      'attachVM',
          formatter: 'AttachVMWithName'
        },
        {
          name:      'backupCreatedFrom',
          labelKey:  'harvester.tableHeaders.vmSchedule',
          value:     'sourceSchedule',
          sort:      'sourceSchedule',
          formatter: 'BackupCreatedFrom',
        },
        {
          name:      'readyToUse',
          labelKey:  'tableHeaders.readyToUse',
          value:     'status.readyToUse',
          align:     'center',
          sort:      'status.readyToUse',
          formatter: 'Checked',
        },
        AGE
      ];
    },

    getRawRows() {
      return this.rows.filter(r => r.spec?.type === BACKUP_TYPE.SNAPSHOT);
    },

    schema() {
      return schema;
    },

    typeDisplay() {
      return this.$store.getters['type-map/labelFor'](schema, 99);
    },

    filteredRows() {
      return this.snapshots.filter(r => r.spec?.type !== BACKUP_TYPE.BACKUP);
    },
  },

  methods: {
    changeRows(filteredRows, searchSchedule) {
      this.$set(this, 'searchSchedule', searchSchedule);
      this.$set(this, 'snapshots', filteredRows);
    },

    sortGenerationFn() {
      let base = defaultTableSortGenerationFn(this.schema, this.$store);

      base += this.searchSchedule;

      return base;
    },
  }
};
</script>

<template>
  <Loading v-if="$fetchState.pending" />
  <div v-else>
    <Masthead
      :schema="null"
      :resource="resource"
      :type-display="typeDisplay"
      :create-button-label="t('harvester.vmSnapshot.createText')"
    />
    <ResourceTable
      v-bind="$attrs"
      :headers="headers"
      :groupable="true"
      :rows="filteredRows"
      :schema="schema"
      :sort-generation-fn="sortGenerationFn"
      key-field="_key"
      default-sort-by="age"
      v-on="$listeners"
    >
      <template #more-header-middle>
        <FilterVMSchedule
          :rows="getRawRows"
          @change-rows="changeRows"
        />
      </template>
      <template #col:name="{row}">
        <td>
          <span>
            <n-link
              v-if="row.status && row.status.source"
              :to="row.detailLocation"
            >
              {{ row.nameDisplay }}
            </n-link>
            <span v-else>
              {{ row.nameDisplay }}
            </span>
          </span>
        </td>
      </template>
    </ResourceTable>
  </div>
</template>
