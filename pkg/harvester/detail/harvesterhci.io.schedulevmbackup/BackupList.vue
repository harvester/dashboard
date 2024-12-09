<script>
import ResourceTable from '@shell/components/ResourceTable';
import { STATE, NAME, AGE } from '@shell/config/table-headers';
import { allSettled } from '../../utils/promise';
import { BACKUP_TYPE } from '../../config/types';
import { HCI } from '../../types';
import { HCI as HCI_ANNOTATIONS } from '@pkg/harvester/config/labels-annotations';

export default {
  name: 'BackupList',

  components: { ResourceTable },

  props: {
    id: {
      type:     String,
      required: true,
    },
  },
  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;
    const hash = await allSettled({ backups: this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.BACKUP }) });

    this.rows = hash.backups;
  },

  data() {
    const inStore = this.$store.getters['currentProduct'].inStore;
    const schema = this.$store.getters[`${ inStore }/schemaFor`](HCI.BACKUP);

    return {
      rows: [],
      schema
    };
  },

  computed: {
    headers() {
      const cols = [
        STATE,
        {
          ...NAME,
          width: 400
        },
        {
          name:      'targetVM',
          labelKey:  'tableHeaders.targetVm',
          value:     'attachVM',
          align:     'left',
          sort:      'attachVM',
          formatter: 'AttachVMWithName'
        },
        {
          name:      'backupTarget',
          labelKey:  'tableHeaders.backupTarget',
          value:     'backupTarget',
          sort:      'backupTarget',
          align:     'left',
          formatter: 'HarvesterBackupTargetValidation'
        },
        {
          name:      'readyToUse',
          labelKey:  'tableHeaders.readyToUse',
          value:     'status.readyToUse',
          sort:      'status.readyToUse',
          align:     'center',
          formatter: 'Checked',
        },
      ];

      if (this.hasBackupProgresses) {
        cols.push({
          name:      'backupProgress',
          labelKey:  'tableHeaders.progress',
          value:     'backupProgress',
          sort:      'backupProgress',
          align:     'left',
          formatter: 'HarvesterBackupProgressBar',
        });
      }
      cols.push(AGE);

      return cols;
    },

    hasBackupProgresses() {
      return !!this.rows.find(R => R.status?.progress !== undefined);
    },

    filteredRows() {
      let r = this.rows.filter(row => row.spec?.type === BACKUP_TYPE.BACKUP);

      if (this.id) {
        r = r.filter(backup => backup.metadata.annotations?.[HCI_ANNOTATIONS.SVM_BACKUP_ID] === this.id);
      }

      return r;
    },
  },
};
</script>

<template>
  <ResourceTable
    v-bind="$attrs"
    :headers="headers"
    :groupable="false"
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
            v-if="row?.status?.source"
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
</template>
