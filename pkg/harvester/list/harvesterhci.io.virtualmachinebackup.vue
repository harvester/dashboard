<script>
import { Banner } from '@components/Banner';
import Loading from '@shell/components/Loading';
import MessageLink from '@shell/components/MessageLink';
import Masthead from '@shell/components/ResourceList/Masthead';
import ResourceTable from '@shell/components/ResourceTable';
<<<<<<< HEAD

=======
import FilterVMSchedule from '../components/FilterVMSchedule';
>>>>>>> b5455bcb (fix: separate used/allocated units)
import { HCI } from '../types';
import { allSettled } from '../utils/promise';
import { STATE, AGE, NAME, NAMESPACE } from '@shell/config/table-headers';
import { BACKUP_TYPE } from '../config/types';
<<<<<<< HEAD
=======
import { defaultTableSortGenerationFn } from '@shell/components/ResourceTable.vue';
>>>>>>> b5455bcb (fix: separate used/allocated units)

export default {
  name:       'HarvesterListBackup',
  components: {
<<<<<<< HEAD
    ResourceTable, Banner, Loading, Masthead, MessageLink
=======
    ResourceTable, Banner, Loading, Masthead, MessageLink, FilterVMSchedule
>>>>>>> b5455bcb (fix: separate used/allocated units)
  },

  props: {
    schema: {
      type:     Object,
      required: true,
<<<<<<< HEAD
    }
=======
    },
>>>>>>> b5455bcb (fix: separate used/allocated units)
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;
    const hash = await allSettled({
<<<<<<< HEAD
      vms:      this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.VM }),
      settings: this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.SETTING }),
      rows:     this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.BACKUP }),
    });

    this.rows = hash.rows;
    this.settings = hash.settings;

=======
      vms:          this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.VM }),
      settings:     this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.SETTING }),
      backups:      this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.BACKUP }),
      scheduleList: this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.SCHEDULE_VM_BACKUP }),
    });

    this.backups = hash.backups;
    this.rows = hash.backups;
    this.settings = hash.settings;
>>>>>>> b5455bcb (fix: separate used/allocated units)
    if (this.$store.getters[`${ inStore }/schemaFor`](HCI.SETTING)) {
      const backupTargetResource = hash.settings.find( O => O.id === 'backup-target');
      const isEmpty = this.getBackupTargetValueIsEmpty(backupTargetResource);

      if (backupTargetResource && !isEmpty) {
        this.testConnect();
      }
    }
  },

  data() {
    const params = { ...this.$route.params };

    const resource = params.resource;

    return {
<<<<<<< HEAD
      rows:     [],
      settings: [],
      resource,
      to:       `${ HCI.SETTING }/backup-target?mode=edit`,
=======
      rows:           [],
      backups:        [],
      settings:       [],
      resource,
      to:             `${ HCI.SETTING }/backup-target?mode=edit`,
      searchSchedule: ''
>>>>>>> b5455bcb (fix: separate used/allocated units)
    };
  },

  methods: {
    async testConnect() {
      try {
        const url = this.$store.getters['harvester-common/getHarvesterClusterUrl']('v1/harvester/backuptarget/healthz');

        await this.$store.dispatch('harvester/request', { url });
      } catch (err) {
        if (err?._status === 400 || err?._status === 503) {
          this.$store.dispatch('growl/error', {
            title:   this.t('harvester.notification.title.error'),
            message: err.errors[0]
          }, { root: true });
        }
      }
    },

    getBackupTargetValueIsEmpty(resource) {
      let out = true;

      if (resource?.value) {
        try {
          const valueJson = JSON.parse(resource?.value);

          out = !valueJson.type;
        } catch (e) {}
      }

      return out;
<<<<<<< HEAD
    }
=======
    },

    getRow(row) {
      return row.status && row.status.source;
    },

    changeRows(filteredRows, searchSchedule) {
      this.$set(this, 'searchSchedule', searchSchedule);
      this.$set(this, 'backups', filteredRows);
    },

    sortGenerationFn() {
      let base = defaultTableSortGenerationFn(this.schema, this.$store);

      base += this.searchSchedule;

      return base;
    },

>>>>>>> b5455bcb (fix: separate used/allocated units)
  },

  computed: {
    headers() {
      const cols = [
        STATE,
        NAME,
        NAMESPACE,
        {
          name:      'targetVM',
<<<<<<< HEAD
          labelKey:  'tableHeaders.targetVm',
=======
          labelKey:  'harvester.tableHeaders.targetVm',
>>>>>>> b5455bcb (fix: separate used/allocated units)
          value:     'attachVM',
          align:     'left',
          formatter: 'AttachVMWithName'
        },
        {
<<<<<<< HEAD
=======
          name:      'backupCreatedFrom',
          labelKey:  'harvester.tableHeaders.vmSchedule',
          value:     'sourceSchedule',
          formatter: 'BackupCreatedFrom',
        },
        {
>>>>>>> b5455bcb (fix: separate used/allocated units)
          name:      'backupTarget',
          labelKey:  'tableHeaders.backupTarget',
          value:     'backupTarget',
          align:     'left',
          formatter: 'HarvesterBackupTargetValidation'
        },
        {
          name:      'readyToUse',
          labelKey:  'tableHeaders.readyToUse',
          value:     'status.readyToUse',
<<<<<<< HEAD
          align:     'left',
=======
          align:     'center',
>>>>>>> b5455bcb (fix: separate used/allocated units)
          formatter: 'Checked',
        },
      ];

      if (this.hasBackupProgresses) {
        cols.push({
          name:      'backupProgress',
          labelKey:  'tableHeaders.progress',
          value:     'backupProgress',
          align:     'left',
          formatter: 'HarvesterBackupProgressBar',
<<<<<<< HEAD
          width:     200,
        });
      }

=======
        });
      }
>>>>>>> b5455bcb (fix: separate used/allocated units)
      cols.push(AGE);

      return cols;
    },

    hasBackupProgresses() {
<<<<<<< HEAD
      return !!this.rows.find(R => R.status?.progress !== undefined);
    },

    filteredRows() {
      return this.rows.filter(R => R.spec?.type !== BACKUP_TYPE.SNAPSHOT);
    },

    backupTargetResource() {
      return this.settings.find( O => O.id === 'backup-target');
=======
      return !!this.backups.find(r => r.status?.progress !== undefined);
    },
    filteredRows() {
      return this.backups.filter(r => r.spec?.type !== BACKUP_TYPE.SNAPSHOT);
    },
    getRawRows() {
      return this.rows.filter(r => r.spec?.type === BACKUP_TYPE.BACKUP);
    },
    backupTargetResource() {
      return this.settings.find(O => O.id === 'backup-target');
>>>>>>> b5455bcb (fix: separate used/allocated units)
    },

    isEmptyValue() {
      return this.getBackupTargetValueIsEmpty(this.backupTargetResource);
    },

    canUpdate() {
      return this?.backupTargetResource?.canUpdate;
    },

    errorMessage() {
      return this.backupTargetResource?.errMessage;
    },
  },
};
</script>

<template>
  <Loading v-if="$fetchState.pending" />
  <div v-else>
    <Masthead
      :schema="schema"
      :resource="resource"
      :create-button-label="t('harvester.backup.createText')"
    />

    <Banner
      v-if="(errorMessage || isEmptyValue) && canUpdate"
      color="error"
    >
      <MessageLink
        v-if="isEmptyValue"
        :to="to"
        prefix-label="harvester.backup.message.noSetting.prefix"
        middle-label="harvester.backup.message.noSetting.middle"
        suffix-label="harvester.backup.message.noSetting.suffix"
      />

      <MessageLink
        v-else
        :to="to"
        prefix-label="harvester.backup.message.errorTip.prefix"
        middle-label="harvester.backup.message.errorTip.middle"
      >
        <template v-slot:suffix>
          {{ t('harvester.backup.message.errorTip.suffix') }} {{ errorMessage }}
        </template>
      </MessageLink>
    </Banner>

    <div v-else-if="canUpdate">
      <Banner
        color="info"
      >
        <MessageLink
          :to="to"
          prefix-label="harvester.backup.message.viewSetting.prefix"
          middle-label="harvester.backup.message.viewSetting.middle"
          suffix-label="harvester.backup.message.viewSetting.suffix"
        />
      </Banner>
    </div>

    <ResourceTable
      v-bind="$attrs"
      :headers="headers"
      :groupable="true"
      :rows="filteredRows"
<<<<<<< HEAD
=======
      :sort-generation-fn="sortGenerationFn"
>>>>>>> b5455bcb (fix: separate used/allocated units)
      :schema="schema"
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
<<<<<<< HEAD
              v-if="row.status && row.status.source"
=======
              v-if="getRow(row)"
>>>>>>> b5455bcb (fix: separate used/allocated units)
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
