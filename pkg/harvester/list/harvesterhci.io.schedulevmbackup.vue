<script>
import Loading from '@shell/components/Loading';
import Masthead from '@shell/components/ResourceList/Masthead';
import ResourceTable from '@shell/components/ResourceTable';
import { HCI } from '../types';
import { allSettled } from '../utils/promise';
import { STATE, AGE, NAME, NAMESPACE } from '@shell/config/table-headers';
import { VM_SCHEDULE_CRON, VM_SCHEDULE_RETAIN, VM_SCHEDULE_TYPE, VM_SCHEDULE_MAX_FAILURE } from '../config/table-headers';
import { BACKUP_TYPE } from '../config/types';

export default {
  name:       'HarvesterListSchedule',
  components: {
    ResourceTable, Loading, Masthead,
  },

  props: {
    schema: {
      type:     Object,
      required: true,
    }
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;
    const hash = await allSettled({
      vms:  this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.VM }),
      rows: this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.SCHEDULE_VM_BACKUP }),
    });

    this.rows = hash.rows;
  },

  data() {
    const params = { ...this.$route.params };
    const resource = params.resource;

    return {
      rows:     [],
      settings: [],
      resource,
      to:       `${ HCI.SETTING }/backup-target?mode=edit`,
    };
  },

  computed: {
    headers() {
      const cols = [
        STATE,
        NAME,
        NAMESPACE,
        {
          name:      'sourceVm',
          labelKey:  'harvester.tableHeaders.sourceVm',
          value:     'spec.vmbackup.source.name',
          sort:      'sourceVm',
          align:     'center',
          formatter: 'AttachVMWithName'
        },
        VM_SCHEDULE_TYPE,
        VM_SCHEDULE_CRON,
        VM_SCHEDULE_RETAIN,
        VM_SCHEDULE_MAX_FAILURE,
        AGE,
      ];

      return cols;
    },

    filteredRows() {
      return this.rows.filter(R => R.spec?.type !== BACKUP_TYPE.SNAPSHOT);
    },

    typeDisplay() {
      return this.t('harvester.schedule.label');
    }
  },

  methods: {
    getRow(row) {
      return row.spec?.vmbackup?.source?.name;
    }
  },
};
</script>

<template>
  <Loading v-if="$fetchState.pending" />
  <div v-else>
    <Masthead
      :schema="schema"
      :resource="resource"
      :type-display="typeDisplay"
      :parentNameOverride="'Virtual Machine schedule'"
      :create-button-label="t('harvester.schedule.createButtonText')"
    />
    <ResourceTable
      v-bind="$attrs"
      :headers="headers"
      :groupable="true"
      :rows="filteredRows"
      :schema="schema"
      key-field="_key"
      default-sort-by="age"
      v-on="$listeners"
    >
      <template #col:name="{row}">
        <td>
          <span>
            <n-link
              v-if="getRow(row)"
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
