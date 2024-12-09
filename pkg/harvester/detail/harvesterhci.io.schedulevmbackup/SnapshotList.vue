<script>
import ResourceTable from '@shell/components/ResourceTable';
import { STATE, NAME, AGE } from '@shell/config/table-headers';
import { allSettled } from '../../utils/promise';
import { BACKUP_TYPE } from '../../config/types';
import { HCI as HCI_ANNOTATIONS } from '@pkg/harvester/config/labels-annotations';
import { HCI } from '../../types';
import { schema } from '../../list/harvesterhci.io.vmsnapshot';

export default {
  name: 'SnapshotList',

  components: { ResourceTable },

  props: {

    id: {
      type:     String,
      required: true,
    },
  },
  async fetch() {
    const hash = await allSettled({ backups: this.$store.dispatch('harvester/findAll', { type: HCI.BACKUP }) });

    this.rows = hash.backups;
  },

  data() {
    return {
      rows: [],
      schema
    };
  },

  computed: {
    headers() {
      return [
        STATE,
        NAME,
        {
          name:      'targetVM',
          labelKey:  'tableHeaders.targetVm',
          value:     'attachVM',
          align:     'left',
          formatter: 'AttachVMWithName'
        },
        {
          name:      'readyToUse',
          labelKey:  'tableHeaders.readyToUse',
          value:     'status.readyToUse',
          align:     'center',
          formatter: 'Checked',
        },
        AGE
      ];
    },

    filteredRows() {
      let r = this.rows.filter(row => row.spec?.type === BACKUP_TYPE.SNAPSHOT);

      if (this.id) {
        r = r.filter(row => row.metadata.annotations?.[HCI_ANNOTATIONS.SVM_BACKUP_ID] === this.id);
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
