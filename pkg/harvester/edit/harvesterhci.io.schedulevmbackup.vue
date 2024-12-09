<script>
import { RadioGroup } from '@components/Form/Radio';
import { Banner } from '@components/Banner';
import { LabeledInput } from '@components/Form/LabeledInput';
import CruResource from '@shell/components/CruResource';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import MessageLink from '@shell/components/MessageLink';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import CreateEditView from '@shell/mixins/create-edit-view';
import { isCronValid } from '@pkg/harvester/utils/cron';
import { PRODUCT_NAME as HARVESTER_PRODUCT } from '@pkg/harvester/config/harvester';
import { allHash } from '@shell/utils/promise';
import { HCI } from '../types';
import { sortBy } from '@shell/utils/sort';
import { BACKUP_TYPE } from '../config/types';
import { _EDIT, _CREATE } from '@shell/config/query-params';

export default {
  name:       'CreateVMSchedule',
  components: {
    CruResource,
    Tabbed,
    Tab,
    RadioGroup,
    LabeledInput,
    LabeledSelect,
    MessageLink,
    Banner,
  },

  mixins: [CreateEditView],

  async fetch() {
    const hash = await allHash({
      settings: this.$store.dispatch('harvester/findAll', { type: HCI.SETTING }),
      vms:      this.$store.dispatch('harvester/findAll', { type: HCI.VM }),
    });

    this.allVms = hash.vms;
    this.settings = hash.settings;
  },

  props: {
    value: {
      type:     Object,
      required: true,
    },
    mode: {
      type:     String,
      required: true,
    }
  },

  data() {
    if (this.mode === _CREATE) {
      const defaultNs = this.$store.getters['defaultNamespace'];
      const vmNamespace = this.$route.query?.vmNamespace || defaultNs;
      const vmName = this.$route.query?.vmName;

      delete this.value.metadata.annotations;
      delete this.value.metadata.labels;
      // set value.metadata
      this.$set(this.value, 'metadata', {
        namespace: vmNamespace,
        name:      vmName ? `svmbackup-${ vmName }` : ''
      });
      // set value.spec
      if (!this.value.spec) {
        this.$set(this.value, 'spec', {
          cron:       '',
          retain:     8,
          maxFailure: 4,
        });
        // set value.spec.vmbackup
        this.$set(this.value.spec, 'vmbackup', {
          source: {
            apiGroup: 'kubevirt.io',
            kind:     'VirtualMachine',
            name:     vmName || ''
          },
          type: BACKUP_TYPE.BACKUP
        });
      }
    }

    return { settings: [] };
  },

  computed: {
    backupTargetResource() {
      return this.settings.find( O => O.id === 'backup-target');
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
    canSave() {
      return !!this.value.spec.cron && isCronValid(this.value.spec.cron) &&
      !!this.value.metadata.name &&
      !!this.value.metadata.namespace &&
      !!this.value.spec.retain &&
      !!this.value.spec.maxFailure;
    },
    isBackupTargetUnAvailable() {
      return this.value.spec.vmbackup.type === BACKUP_TYPE.BACKUP && (this.errorMessage || this.isEmptyValue) && this.canUpdate;
    },
    vmOptions() {
      const nsVmList = this.$store.getters['harvester/all'](HCI.VM).filter(vm => vm.metadata.namespace === this.value.metadata.namespace);
      const vmObjectLists = nsVmList.map(obj => ({
        label: obj.nameDisplay,
        value: obj.name,
      }));

      return sortBy(vmObjectLists, 'label');
    },

    namespaces() {
      const allNamespaces = this.$store.getters['allNamespaces'];
      const out = sortBy(
        allNamespaces.map((obj) => {
          return {
            label: obj.nameDisplay,
            value: obj.id,
          };
        }),
        'label'
      );

      return out;
    },
    toBackupTargetSetting() {
      const { cluster } = this.$router?.currentRoute?.params || {};

      return {
        name:   `${ HARVESTER_PRODUCT }-c-cluster-resource-id`,
        params: {
          resource: `${ HCI.SETTING }`,
          cluster,
          id:       'backup-target'
        },
        query: { mode: _EDIT }
      };
    },
    scheduleTypeOptions() {
      return [BACKUP_TYPE.BACKUP, BACKUP_TYPE.SNAPSHOT];
    }
  },

  watch: {
    'value.metadata.namespace'() {
      this.value.spec.vmbackup.source.name = '';
    },
    'value.spec.vmbackup.source.name'(neu) {
      this.value.metadata.name = `svm${ this.value.spec.vmbackup.type }-${ neu }`;
    }
  },

  methods: {
    onTypeChange(newType) {
      this.value.metadata.name = `svm${ newType }-${ this.value.spec.vmbackup.source.name }`;
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

    validateFailure(count) {
      if (this.value.spec.retain && count > this.value.spec.retain) {
        this.$set(this.value.spec, 'maxFailure', this.value.spec.retain);
      }
    },
  },
};
</script>

<template>
  <CruResource
    :done-route="doneRoute"
    :resource="value"
    :mode="mode"
    :errors="errors"
    :apply-hooks="applyHooks"
    :validationPassed="canSave"
    @finish="save"
    @error="e=>errors = e"
  >
    <div class="banner">
      <Banner
        v-if="isBackupTargetUnAvailable"
        color="error"
      >
        <MessageLink
          v-if="isEmptyValue"
          :to="toBackupTargetSetting"
          :target="_blank"
          prefix-label="harvester.backup.message.noSetting.prefix"
          middle-label="harvester.backup.message.noSetting.middle"
          suffix-label="harvester.schedule.message.noSetting.suffix"
        />
        <MessageLink
          v-else
          :to="toBackupTargetSetting"
          prefix-label="harvester.backup.message.errorTip.prefix"
          middle-label="harvester.backup.message.errorTip.middle"
        >
          <template v-slot:suffix>
            {{ t('harvester.backup.message.errorTip.suffix') }} {{ errorMessage }}
          </template>
        </MessageLink>
      </Banner>
      <div class="mb-30">
        <RadioGroup
          v-model="value.spec.vmbackup.type"
          name="model"
          :options="scheduleTypeOptions"
          :labels="[t('harvester.schedule.type.backup'), t('harvester.schedule.type.snapshot')]"
          :disabled="isEdit || isView"
          :mode="mode"
          row
          @input="onTypeChange"
        />
      </div>
      <div class="row mb-30">
        <div class="col span-6">
          <LabeledSelect
            v-model="value.metadata.namespace"
            :label="t('nameNsDescription.namespace.label')"
            :options="namespaces"
            required
            :disabled="isBackupTargetUnAvailable || isEdit || isView"
          />
        </div>
        <div class="col span-6">
          <LabeledSelect
            v-model="value.spec.vmbackup.source.name"
            :label="t('harvester.schedule.virtualMachine.title')"
            :placeholder="t('harvester.schedule.virtualMachine.placeholder')"
            :options="vmOptions"
            required
            :disabled="isBackupTargetUnAvailable || isEdit || isView"
          />
        </div>
      </div>
    </div>
    <Tabbed v-bind="$attrs" class="mt-15" :side-tabs="true">
      <Tab name="basics" :label="t('harvester.network.tabs.basics')" :weight="99" class="bordered-table">
        <LabeledInput
          v-model="value.spec.cron"
          class="mb-30"
          type="cron"
          required
          :mode="mode"
          :label="t('harvester.schedule.cron')"
          placeholder="0 * * * *"
          :disabled="isBackupTargetUnAvailable || isView"
        />
        <LabeledInput
          v-model.number="value.spec.retain"
          v-int-number
          class="mb-30"
          :min="2"
          :max="250"
          type="number"
          :label="t('harvester.schedule.retain.label')"
          required
          :tooltip="t('harvester.schedule.retain.tooltip')"
          :disabled="isBackupTargetUnAvailable || isView"
        />
        <LabeledInput
          v-model.number="value.spec.maxFailure"
          v-int-number
          class="mb-30"
          :min="2"
          type="number"
          :label="t('harvester.schedule.maxFailure.label')"
          required
          :tooltip="t('harvester.schedule.maxFailure.tooltip')"
          :disabled="isBackupTargetUnAvailable || isView"
          @input="validateFailure"
        />
      </Tab>
    </Tabbed>
  </CruResource>
</template>
