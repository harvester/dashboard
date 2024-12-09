<script>
import Loading from '@shell/components/Loading';
import Masthead from '@shell/components/ResourceList/Masthead';
import ResourceTable from '@shell/components/ResourceTable';
<<<<<<< HEAD

import { HCI } from '../types';
import { SCHEMA } from '@shell/config/types';
import { allHash } from '@shell/utils/promise';
import { STATE, AGE, NAME, NAMESPACE } from '@shell/config/table-headers';
import { BACKUP_TYPE } from '../config/types';

const schema = {
=======
import { HCI } from '../types';
import { SCHEMA } from '@shell/config/types';
import { allHash } from '@shell/utils/promise';
import FilterVMSchedule from '../components/FilterVMSchedule';
import { STATE, AGE, NAME, NAMESPACE } from '@shell/config/table-headers';
import { BACKUP_TYPE } from '../config/types';
import { defaultTableSortGenerationFn } from '@shell/components/ResourceTable.vue';

export const schema = {
>>>>>>> b5455bcb (fix: separate used/allocated units)
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
<<<<<<< HEAD
    ResourceTable, Loading, Masthead
=======
    ResourceTable, Loading, Masthead, FilterVMSchedule
>>>>>>> b5455bcb (fix: separate used/allocated units)
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
<<<<<<< HEAD
=======
    this.snapshots = hash.rows;
>>>>>>> b5455bcb (fix: separate used/allocated units)
  },

  data() {
    const params = { ...this.$route.params };

    const resource = params.resource;

    return {
<<<<<<< HEAD
      rows: [],
=======
      rows:           [],
      snapshots:      [],
      searchSchedule: '',
>>>>>>> b5455bcb (fix: separate used/allocated units)
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
<<<<<<< HEAD
          labelKey:  'tableHeaders.targetVm',
          value:     'attachVM',
          align:     'left',
          formatter: 'AttachVMWithName'
        },
        {
          name:      'readyToUse',
          labelKey:  'tableHeaders.readyToUse',
          value:     'status.readyToUse',
          align:     'left',
=======
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
>>>>>>> b5455bcb (fix: separate used/allocated units)
          formatter: 'Checked',
        },
        AGE
      ];
    },

<<<<<<< HEAD
=======
    getRawRows() {
      return this.rows.filter(r => r.spec?.type === BACKUP_TYPE.SNAPSHOT);
    },

>>>>>>> b5455bcb (fix: separate used/allocated units)
    schema() {
      return schema;
    },

    typeDisplay() {
      return this.$store.getters['type-map/labelFor'](schema, 99);
    },

    filteredRows() {
<<<<<<< HEAD
      return this.rows.filter(R => R.spec?.type !== BACKUP_TYPE.BACKUP);
    },
  },
=======
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
>>>>>>> b5455bcb (fix: separate used/allocated units)
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
<<<<<<< HEAD

=======
>>>>>>> b5455bcb (fix: separate used/allocated units)
    <ResourceTable
      v-bind="$attrs"
      :headers="headers"
      :groupable="true"
      :rows="filteredRows"
      :schema="schema"
<<<<<<< HEAD
=======
      :sort-generation-fn="sortGenerationFn"
>>>>>>> b5455bcb (fix: separate used/allocated units)
      key-field="_key"
      default-sort-by="age"
      v-on="$listeners"
    >
<<<<<<< HEAD
=======
      <template #more-header-middle>
        <FilterVMSchedule
          :rows="getRawRows"
          @change-rows="changeRows"
        />
      </template>
>>>>>>> b5455bcb (fix: separate used/allocated units)
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
<<<<<<< HEAD
    </resourcetable>
=======
    </ResourceTable>
>>>>>>> b5455bcb (fix: separate used/allocated units)
  </div>
</template>
