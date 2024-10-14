<script>
import { Banner } from '@components/Banner';
import Loading from '@shell/components/Loading';
import MessageLink from '@shell/components/MessageLink';
import Masthead from '@shell/components/ResourceList/Masthead';
import ResourceTable from '@shell/components/ResourceTable';
import FilterVMSchedule from '../components/FilterVMSchedule';
import { HCI } from '../types';
import { allSettled } from '../utils/promise';
import { STATE, AGE, NAME, NAMESPACE } from '@shell/config/table-headers';
import { BACKUP_TYPE } from '../config/types';
import { defaultTableSortGenerationFn } from '@shell/components/ResourceTable.vue';

export default {
  name:       'HarvesterListBackup',
  components: {
    ResourceTable, Banner, Loading, Masthead, MessageLink, FilterVMSchedule
  },

  props: {
    schema: {
      type:     Object,
      required: true,
    },
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;
    const hash = await allSettled({
      vms:          this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.VM }),
      settings:     this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.SETTING }),
      backups:      this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.BACKUP }),
      scheduleList: this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.SCHEDULE_VM_BACKUP }),
    });

    this.backups = hash.backups;
    this.rows = hash.backups;
    this.settings = hash.settings;
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
      rows:           [],
      backups:        [],
      settings:       [],
      resource,
      to:             `${ HCI.SETTING }/backup-target?mode=edit`,
      searchSchedule: ''
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

  },

  computed: {
    headers() {
      const cols = [
        STATE,
        NAME,
        NAMESPACE,
        {
          name:      'targetVM',
          labelKey:  'harvester.tableHeaders.targetVm',
          value:     'attachVM',
          align:     'left',
          formatter: 'AttachVMWithName'
        },
        {
          name:      'backupCreatedFrom',
          labelKey:  'harvester.tableHeaders.vmSchedule',
          value:     'sourceSchedule',
          formatter: 'BackupCreatedFrom',
        },
        {
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
          align:     'center',
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
        });
      }
      cols.push(AGE);

      return cols;
    },

    hasBackupProgresses() {
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
      :sort-generation-fn="sortGenerationFn"
      :schema="schema"
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
