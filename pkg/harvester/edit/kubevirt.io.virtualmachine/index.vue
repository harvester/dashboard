<script>
import { isEqual } from 'lodash';
import { mapGetters } from 'vuex';
import { Banner } from '@components/Banner';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import { Checkbox } from '@components/Form/Checkbox';
import CruResource from '@shell/components/CruResource';
import { RadioGroup } from '@components/Form/Radio';
import { LabeledInput } from '@components/Form/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import UnitInput from '@shell/components/form/UnitInput';
import Labels from '@shell/components/form/Labels';
import MessageLink from '@shell/components/MessageLink';
import Reserved from './VirtualMachineReserved';
import SSHKey from './VirtualMachineSSHKey';
import Volume from './VirtualMachineVolume';
import Network from './VirtualMachineNetwork';
import CpuMemory from './VirtualMachineCpuMemory';
import CloudConfig from './VirtualMachineCloudConfig';
import NodeScheduling from '@shell/components/form/NodeScheduling';
import PodAffinity from '@shell/components/form/PodAffinity';
import AccessCredentials from './VirtualMachineAccessCredentials';
import PciDevices from './VirtualMachinePciDevices/index';
import VGpuDevices from './VirtualMachineVGpuDevices/index';
import UsbDevices from './VirtualMachineUSBDevices/index';
import RestartVMDialog from '../../dialog/RestartVMDialog';
import KeyValue from '@shell/components/form/KeyValue';

import { clear } from '@shell/utils/array';
import { clone } from '@shell/utils/object';
import { HCI } from '../../types';
import { saferDump } from '@shell/utils/create-yaml';
import { exceptionToErrorsArray } from '@shell/utils/error';
import { HCI as HCI_ANNOTATIONS } from '@pkg/harvester/config/labels-annotations';
import { BEFORE_SAVE_HOOKS, AFTER_SAVE_HOOKS } from '@shell/mixins/child-hook';

import VM_MIXIN from '../../mixins/harvester-vm';
import CreateEditView from '@shell/mixins/create-edit-view';

import { parseVolumeClaimTemplates } from '@pkg/utils/vm';

export default {
  name: 'HarvesterEditVM',

  components: {
    Tab,
    Tabbed,
    Checkbox,
    RadioGroup,
    CruResource,
    LabeledInput,
    LabeledSelect,
    NameNsDescription,
    Volume,
    SSHKey,
    Network,
    CpuMemory,
    CloudConfig,
    NodeScheduling,
    PodAffinity,
    AccessCredentials,
    Reserved,
    Labels,
    PciDevices,
    RestartVMDialog,
    UnitInput,
    VGpuDevices,
    KeyValue,
    Banner,
    MessageLink,
    UsbDevices,
  },

  mixins: [CreateEditView, VM_MIXIN],

  props: {
    value: {
      type:     Object,
      required: true,
    },
  },

  data() {
    const cloneVM = clone(this.value);
    const isRestartImmediately = this.value.actualState === 'Running';

    const hostname = this.value.spec.template.spec.hostname || '';

    return {
      cloneVM,
      count:             2,
      templateId:        '',
      templateVersionId: '',
      namePrefix:        '',
      isSingle:          true,
      useTemplate:       false,
      hostname,
      isRestartImmediately,
      // isOpen:            false,
    };
  },

  computed: {
    ...mapGetters({ t: 'i18n/t' }),

    to() {
      return {
        name:   'harvester-c-cluster-resource',
        params: { cluster: this.$store.getters['clusterId'], resource: HCI.HOST },
      };
    },

    machineTypeOptions() {
      return [{
        label: 'None',
        value: ''
      }, {
        label: 'q35',
        value: 'q35'
      }];
    },

    templateOptions() {
      return this.templates.map( (T) => {
        const isReady = this.hasAvailableVersion(T.id);

        return {
          label:    T.id,
          value:    T.id,
          disabled: !isReady
        };
      });
    },

    versionOptions() {
      const defaultVersion = this.curTemplateResource?.defaultVersion;

      return this.versions.filter( O => O.templateId === this.templateId).map( (T) => {
        const version = T.version;

        const label = defaultVersion === version ? `${ version } (${ this.t('generic.default') })` : version;
        const value = T.id;

        return {
          label,
          value,
          disabled: !T.isReady
        };
      });
    },

    curTemplateResource() {
      return this.templates.find( O => O.id === this.templateId);
    },

    nameLabel() {
      return this.isSingle ? 'harvester.virtualMachine.instance.single.nameLabel' : 'harvester.virtualMachine.instance.multiple.nameLabel';
    },

    hostnameLabel() {
      return this.isSingle ? 'harvester.virtualMachine.instance.single.host.label' : 'harvester.virtualMachine.instance.multiple.host.label';
    },

    hostPlaceholder() {
      return this.isSingle ? this.t('harvester.virtualMachine.instance.single.host.placeholder') : this.t('harvester.virtualMachine.instance.multiple.host.placeholder');
    },

    secretNamePrefix() {
      return this.value?.metadata?.name;
    },

    isQemuInstalled() {
      return this.value.isQemuInstalled;
    },

    hasRestartAction() {
      return this.value.hasAction('restart');
    },

    hasStartAction() {
      return this.value.hasAction('start');
    },

    enableCpuPinningCheckbox() {
      if (this.mode === 'create') {
        return this.nodes.some(node => node.isCPUManagerEnabled); // any one of nodes has label cpuManager=true
      }

      return true;
    },

    showCpuPinningBanner() {
      if (this.mode === 'edit') {
        return this.cpuPinning !== !!this.cloneVM.spec.template.spec.domain.cpu.dedicatedCpuPlacement;
      }

      if (this.mode === 'create') {
        return this.nodes.every(node => !node.isCPUManagerEnabled); // no node enabled CPU manager
      }

      return false;
    }
  },

  watch: {
    templateId: {
      async handler(id, old) {
        if (!id) {
          return;
        }
        if (id !== old && !this.templateVersionId) {
          const templates = await this.$store.dispatch('harvester/findAll', { type: HCI.VM_TEMPLATE });

          this.templateVersionId = templates.find( O => O.id === id)?.spec?.defaultVersionId;
        }
      },
      immediate: false
    },

    templateVersionId: {
      async handler(id) {
        if (!id) {
          return;
        }
        const versions = await this.$store.dispatch('harvester/findAll', { type: HCI.VM_VERSION });
        const curVersion = versions.find( V => V.id === id);
        const cloneVersionVM = clone(curVersion.spec.vm);

        delete cloneVersionVM.spec?.template?.spec?.accessCredentials;
        delete cloneVersionVM.spec?.template?.metadata?.annotations?.[HCI_ANNOTATIONS.DYNAMIC_SSHKEYS_NAMES];
        delete cloneVersionVM.spec?.template?.metadata?.annotations?.[HCI_ANNOTATIONS.DYNAMIC_SSHKEYS_USERS];

        const claimTemplate = parseVolumeClaimTemplates(cloneVersionVM);

        const deleteDataSource = claimTemplate.map((volume) => {
          if (volume?.spec?.dataSource) {
            delete volume.spec.dataSource;
          }

          return volume;
        });

        cloneVersionVM.metadata.annotations[HCI_ANNOTATIONS.VOLUME_CLAIM_TEMPLATE] = JSON.stringify(deleteDataSource);

        this.getInitConfig({
          value: cloneVersionVM, existUserData: true, fromTemplate: true
        });
        this.$set(this, 'hasCreateVolumes', []); // When using the template, all volume names need to be newly created
      }
    },

    useTemplate(neu) {
      if (neu === false) {
        this.templateId = '';
        this.templateVersionId = '';
        this.value.applyDefaults();
        this.getInitConfig({ value: this.value, init: this.isCreate });
      }
    },
  },

  created() {
    this.registerAfterHook(async() => {
      await this.restartVM();
      const id = `${ this.value.metadata.namespace }/${ this.value.metadata.name }`;

      const res = this.$store.getters['harvester/byId'](HCI.VM, id);

      try {
        await this.saveSecret(res);
        await this.saveAccessCredentials(res);
      } catch (e) {
        this.errors.push(...exceptionToErrorsArray(e));
      }

      if (!this.errors.length && this.isSingle) {
        this.done();
      }
    });

    if (this.registerBeforeHook) {
      this.registerBeforeHook(this.updateBeforeSave);
    }
  },

  mounted() {
    this.imageId = this.$route.query?.image || this.imageId;

    const diskRows = this.getDiskRows(this.value);

    this.$set(this, 'diskRows', diskRows);
    const templateId = this.$route.query.templateId;
    const templateVersionId = this.$route.query.versionId;

    if (templateId && templateVersionId) {
      this.templateId = templateId;
      this.templateVersionId = templateVersionId;
      this.useTemplate = true;
    }
  },

  methods: {
    cancelAction() {
      const { fromPage = HCI.VM } = this.$route?.query; // default back to VM list page
      const cancelOverride = {
        name:   this.doneRoute,
        params: { resource: fromPage }
      };

      this.$router.replace(cancelOverride);
    },
    saveVM(buttonCb) {
      clear(this.errors);

      if (this.isSingle) {
        this.saveSingle(buttonCb);
      } else {
        this.saveMultiple(buttonCb);
      }
    },

    async saveSingle(buttonCb) {
      this.parseVM();
      this.value.spec.template.spec.hostname = this.hostname ? this.hostname : this.value.metadata.name;
      await this._save(this.value, buttonCb);
      if (!this.errors.length) {
        buttonCb(true);
      } else {
        buttonCb(false);
      }
    },

    async saveMultiple(buttonCb) {
      this.namePrefix = this.value.metadata.name || '';
      const join = this.namePrefix.endsWith('-') ? '' : '-';
      const baseHostname = this.hostname ? this.hostname : this.namePrefix;

      if (this.count < 1) {
        this.errors = [this.t('harvester.virtualMachine.instance.multiple.countTip')];
        buttonCb(false);

        return;
      }

      if (!this.value.metadata.name) {
        this.errors.push(this.t('validation.required', { key: this.t('generic.name') }, true));
        buttonCb(false);

        return;
      }

      const cloneValue = clone(this.value);
      const cloneSpec = clone(this.spec);

      for (let i = 1; i <= this.count; i++) {
        this.$set(this.value, 'spec', cloneValue.spec);
        this.$set(this, 'spec', cloneSpec);
        const suffix = i < 10 ? `0${ i }` : i;

        this.value.cleanForNew();
        this.value.metadata.name = `${ this.namePrefix }${ join }${ suffix }`;
        this.$set(this.value.spec.template.spec, 'hostname', `${ baseHostname }${ join }${ suffix }`);
        this.secretName = '';
        await this.parseVM();
        const basicValue = await this.$store.dispatch('harvester/clone', { resource: this.value });

        await this._save(basicValue, buttonCb);

        if (i === this.count && !this.errors.length) {
          buttonCb(true);
          this.done();
        } else if (i === this.count) {
          this.value.metadata.name = this.namePrefix;
          buttonCb(false);
        }
      }
    },

    async _save(value, buttonCb) {
      try {
        await this.applyHooks(BEFORE_SAVE_HOOKS);
        await value.save();
        await this.applyHooks(AFTER_SAVE_HOOKS);
      } catch (e) {
        this.errors.push(...exceptionToErrorsArray(e));
        buttonCb(false);
      }
    },

    restartVM() {
      if (this.mode !== 'edit') {
        return;
      }
      if (!this.value.isRunning) {
        return;
      }
      const cloneDeepNewVM = clone(this.value);

      delete cloneDeepNewVM?.metadata;
      delete this.cloneVM?.metadata;
      delete this.cloneVM?.__clone;

      const oldVM = JSON.parse(JSON.stringify(this.cloneVM));
      const newVM = JSON.parse(JSON.stringify(cloneDeepNewVM));

      if (isEqual(oldVM, newVM)) {
        return;
      }

      return new Promise((resolve) => {
        if (this.$refs.restartDialog) {
          this.$refs.restartDialog.open();
          this.$refs.restartDialog.resolve = resolve;
        }
      });
    },

    updateBeforeSave() {
      if (this.isSingle) {
        if (!this.value.spec.template.spec.hostname) {
          this.$set(this.value.spec.template.spec, 'hostname', this.value.metadata.name);
        }
      }

      const errors = this.getAccessCredentialsValidation();

      if (errors.length > 0) {
        return Promise.reject(errors);
      } else {
        return Promise.resolve();
      }
    },

    validateCount(count) {
      if (count > 10) {
        this.$set(this, 'count', 10);
      }
    },

    updateTemplateId() {
      this.templateVersionId = '';
    },

    onTabChanged({ tab }) {
      if (tab.name === 'advanced') {
        this.$refs.yamlEditor?.refresh();
      }
    },

    hasAvailableVersion(templateId) {
      let hasAvailableVersion = false;

      this.versions.filter( O => O.templateId === templateId).find( (T) => {
        if (T.isReady) {
          hasAvailableVersion = true;
        }
      });

      return hasAvailableVersion;
    },

    generateYaml() {
      this.parseVM();
      const out = saferDump(this.value);

      return out;
    },
  },
};
</script>

<template>
  <CruResource
    v-if="spec"
    id="vm"
    :done-route="doneRoute"
    :resource="value"
    :cancelEvent="true"
    :mode="mode"
    :can-yaml="isSingle ? true : false"
    :errors="errors"
    :generate-yaml="generateYaml"
    :apply-hooks="applyHooks"
    @finish="saveVM"
    @cancel="cancelAction"
  >
    <RadioGroup
      v-if="isCreate"
      v-model="isSingle"
      class="mb-20 vm-radio-group"
      name="createInstanceMode"
      :options="[true,false]"
      :labels="[t('harvester.virtualMachine.instance.single.label'), t('harvester.virtualMachine.instance.multiple.label')]"
    />

    <NameNsDescription
      v-model="value"
      :mode="mode"
      :has-extra="!isSingle"
      :name-label="nameLabel"
      :namespaced="true"
      :name-placeholder="isSingle ? 'nameNsDescription.name.placeholder' : 'harvester.virtualMachine.instance.multiple.nameNsDescription'"
      :extra-columns="isSingle ? [] :['type']"
    >
      <template v-slot:type>
        <LabeledInput
          v-if="!isSingle"
          v-model.number="count"
          v-int-number
          :min="2"
          type="number"
          :label="t('harvester.virtualMachine.instance.multiple.count')"
          required
          @input="validateCount"
        />
      </template>
    </NameNsDescription>

    <Checkbox
      v-if="isCreate"
      v-model="useTemplate"
      class="check mb-20"
      type="checkbox"
      label-key="harvester.virtualMachine.useTemplate.label"
    />

    <div v-if="useTemplate" class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model="templateId"
          label-key="harvester.virtualMachine.useTemplate.template.label"
          :options="templateOptions"
          @input="updateTemplateId"
        />
      </div>

      <div class="col span-6">
        <LabeledSelect
          v-model="templateVersionId"
          label-key="harvester.virtualMachine.useTemplate.version.label"
          :options="versionOptions"
        />
      </div>
    </div>

    <Tabbed :side-tabs="true" @changed="onTabChanged">
      <Tab name="basics" :label="t('harvester.virtualMachine.detail.tabs.basics')">
        <CpuMemory
          :cpu="cpu"
          :memory="memory"
          :mode="mode"
          @updateCpuMemory="updateCpuMemory"
        />

        <SSHKey
          v-model="sshKey"
          class="mb-20"
          :create-namespace="true"
          :namespace="value.metadata.namespace"
          :mode="mode"
          :disabled="isWindows"
          @update:sshKey="updateSSHKey"
          @register-after-hook="registerAfterHook"
        />
      </Tab>

      <Tab name="Volume" :label="t('harvester.tab.volume')" :weight="-1">
        <Volume
          v-model="diskRows"
          :mode="mode"
          :custom-volume-mode="customVolumeMode"
          :namespace="value.metadata.namespace"
          :resource-type="value.type"
          :vm="value"
          :validate-required="true"
        />
      </Tab>

      <Tab name="Network" :label="t('harvester.tab.network')" :weight="-2">
        <Network v-model="networkRows" :mode="mode" :is-single="isSingle" />
      </Tab>

      <Tab name="nodeScheduling" :label="t('workload.container.titles.nodeScheduling')" :weight="-3">
        <template #default="{active}">
          <NodeScheduling :key="active" :mode="mode" :value="spec.template.spec" :nodes="nodesIdOptions" />
        </template>
      </Tab>

      <Tab :label="t('harvester.tab.vmScheduling')" name="vmScheduling" :weight="-4">
        <template #default="{active}">
          <PodAffinity
            :key="active"
            :mode="mode"
            :value="spec.template.spec"
            :nodes="nodes"
            :all-namespaces-option-available="true"
            :namespaces="filteredNamespaces"
            :overwrite-labels="affinityLabels"
          />
        </template>
      </Tab>

      <Tab v-if="enabledPCI" :label="t('harvester.tab.pciDevices')" name="pciDevices" :weight="-5">
        <PciDevices :mode="mode" :value="spec.template.spec" :vm="value" />
      </Tab>

      <Tab v-if="enabledSriovgpu" :label="t('harvester.tab.vGpuDevices')" name="vGpuDevices" :weight="-6">
        <VGpuDevices :mode="mode" :value="spec.template.spec" :vm="value" />
      </Tab>

      <Tab v-if="enabledPCI" :label="t('harvester.tab.usbDevices')" name="usbDevices" :weight="-7">
        <UsbDevices :mode="mode" :value="spec.template.spec" :vm="value" />
      </Tab>

      <Tab v-if="isEdit" :label="t('harvester.tab.accessCredentials')" name="accessCredentials" :weight="-8">
        <AccessCredentials v-model="accessCredentials" :mode="mode" :resource="value" :is-qemu-installed="isQemuInstalled" />
      </Tab>

      <Tab
        name="instanceLabel"
        :label="t('harvester.tab.instanceLabel')"
        :weight="-8"
      >
        <Labels
          :default-container-class="'labels-and-annotations-container'"
          :value="value"
          :mode="mode"
          :display-side-by-side="false"
          :show-annotations="false"
          :show-label-title="false"
        >
          <template #labels="{toggler}">
            <KeyValue
              key="labels"
              :value="value.instanceLabels"
              :protected-keys="value.systemLabels || []"
              :toggle-filter="toggler"
              :add-label="t('labels.addLabel')"
              :mode="mode"
              :read-allowed="false"
              :value-can-be-empty="true"
              @input="value.setInstanceLabels($event)"
            />
          </template>
        </Labels>
      </Tab>

      <Tab
        name="advanced"
        :label="t('harvester.tab.advanced')"
        :weight="-9"
      >
        <div class="row mb-20">
          <div class="col span-6">
            <LabeledSelect
              v-model="runStrategy"
              label-key="harvester.virtualMachine.runStrategy"
              :options="runStrategies"
              :mode="mode"
            />
          </div>

          <div class="col span-6">
            <LabeledSelect
              v-model="osType"
              label-key="harvester.virtualMachine.osType"
              :options="OS"
              :disabled="!isCreate"
            />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-6">
            <LabeledSelect
              v-model="maintenanceStrategy"
              label-key="harvester.virtualMachine.maintenanceStrategy.label"
              :options="maintenanceStrategies"
              :get-option-label="getMaintenanceStrategyOptionLabel"
              :mode="mode"
            />
          </div>
          <div class="col span-6">
            <Reserved
              :reserved-memory="reservedMemory"
              :mode="mode"
              @updateReserved="updateReserved"
            />
          </div>
        </div>

        <div class="row mb-20">
          <a v-if="showAdvanced" v-t="'harvester.generic.showMore'" role="button" @click="toggleAdvanced" />
          <a v-else v-t="'harvester.generic.showMore'" role="button" @click="toggleAdvanced" />
        </div>

        <div v-if="showAdvanced" class="mb-20">
          <div class="row mb-20">
            <div class="col span-6">
              <LabeledInput
                v-model="hostname"
                :label-key="hostnameLabel"
                :placeholder="hostPlaceholder"
                :mode="mode"
              />
            </div>

            <div class="col span-6">
              <LabeledSelect
                v-model="machineType"
                label-key="harvester.virtualMachine.input.MachineType"
                :options="machineTypeOptions"
                :mode="mode"
              />
            </div>
          </div>

          <div class="row mb-20">
            <div class="col span-6">
              <UnitInput
                v-model="terminationGracePeriodSeconds"
                :suffix="terminationGracePeriodSeconds == 1 ? 'Second' : 'Seconds'"
                :label="t('harvester.virtualMachine.terminationGracePeriodSeconds.label')"
                :mode="mode"
                positive
                @input="updateTerminationGracePeriodSeconds"
              />
            </div>
          </div>
        </div>

        <CloudConfig
          ref="yamlEditor"
          :user-script="userScript"
          :mode="mode"
          :view-code="isWindows"
          :namespace="value.metadata.namespace"
          :network-script="networkScript"
          @updateUserData="updateUserData"
          @updateNetworkData="updateNetworkData"
          @updateDataTemplateId="updateDataTemplateId"
        />

        <Checkbox
          v-model="cpuPinning"
          :disabled="!enableCpuPinningCheckbox"
          class="check"
          type="checkbox"
          tooltip-key="harvester.virtualMachine.cpuPinning.tooltip"
          label-key="harvester.virtualMachine.cpuPinning.label"
          :mode="mode"
        />

        <Checkbox
          v-model="installUSBTablet"
          class="check mt-20"
          type="checkbox"
          tooltip-key="harvester.virtualMachine.usbTip"
          label-key="harvester.virtualMachine.enableUsb"
          :mode="mode"
        />

        <Checkbox
          v-model="installAgent"
          class="check"
          type="checkbox"
          :disabled="isWindows"
          label-key="harvester.virtualMachine.installAgent"
          :mode="mode"
          @input="updateAgent"
        />

        <Checkbox
          v-model="tpmEnabled"
          class="check"
          type="checkbox"
          label-key="harvester.virtualMachine.advancedOptions.tpm"
          :mode="mode"
        />

        <Checkbox
          v-model="efiEnabled"
          class="check"
          type="checkbox"
          :label="t('harvester.virtualMachine.efiEnabled')"
          :mode="mode"
        />

        <Checkbox
          v-if="efiEnabled"
          v-model="secureBoot"
          class="check"
          type="checkbox"
          :label="t('harvester.virtualMachine.secureBoot')"
          :mode="mode"
        />
        <Banner
          v-if="showCpuPinningBanner"
          color="warning"
        >
          <MessageLink
            v-if="mode === 'create'"
            :to="to"
            prefix-label="harvester.virtualMachine.advancedOptions.cpuManager.prefix"
            middle-label="harvester.virtualMachine.advancedOptions.cpuManager.middle"
            suffix-label="harvester.virtualMachine.advancedOptions.cpuManager.suffix"
          />
          <span v-if="mode==='edit'">
            {{ t('harvester.virtualMachine.cpuPinning.restartVMMessage') }}
          </span>
        </Banner>
      </Tab>
    </Tabbed>

    <RestartVMDialog
      ref="restartDialog"
      :vm="value"
    />
  </CruResource>
</template>

<style lang="scss" scoped>
#vm {
  ::v-deep .vm-radio-group .radio-group {
    display: flex;
    .radio-container {
      margin-right: 30px;
    }
  }

  .restart {
    display: flex;
    justify-content: flex-end;
  }

  .banner-right {
    width: auto;
    display: flex;
    justify-items: center;
  }
}
</style>
