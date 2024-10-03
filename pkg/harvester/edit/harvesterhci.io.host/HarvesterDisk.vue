<script>
import { allHash } from '@shell/utils/promise';
import { CSI_DRIVER, LONGHORN } from '@shell/config/types';
import { LabeledInput } from '@components/Form/LabeledInput';
import LabelValue from '@shell/components/LabelValue';
import { BadgeState } from '@components/BadgeState';
import { Banner } from '@components/Banner';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { RadioGroup, RadioButton } from '@components/Form/Radio';
import HarvesterDisk from '../../mixins/harvester-disk';
import Tags from '../../components/DiskTags';
import { HCI } from '../../types';
import { HCI as HCI_LABELS_ANNOTATIONS } from '@pkg/harvester/config/labels-annotations';
import { LONGHORN_SYSTEM } from './index';
import { LONGHORN_DRIVER, LONGHORN_VERSION_V1, LONGHORN_VERSION_V2 } from '@shell/models/persistentvolume';
import { LVM_DRIVER } from '../../models/harvester/storage.k8s.io.storageclass';
import ModalWithCard from '@shell/components/ModalWithCard';
import { randomStr } from '@shell/utils/string';
import { LONGHORN_V2_DATA_ENGINE } from './index.vue';
import { _EDIT } from '@shell/config/query-params';

const _NEW = '_NEW';

export default {
  components: {
    LabeledInput,
    LabeledSelect,
    LabelValue,
    BadgeState,
    Banner,
    RadioGroup,
    RadioButton,
    ModalWithCard,
    Tags,
  },

  mixins: [
    HarvesterDisk,
  ],

  props: {
    value: {
      type:    Object,
      default: () => {
        return {};
      },
    },
    disks: {
      type:    Array,
      default: () => [],
    },
    node: {
      type:    Object,
      default: () => {
        return {};
      },
    },
    mode: {
      type:    String,
      default: 'edit',
    },
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;

    await allHash({
      csiDrivers:      this.$store.dispatch(`${ inStore }/findAll`, { type: CSI_DRIVER }),
      lvmVolumeGroups: this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.LVM_VOLUME_GROUP }),
    });
  },

  data() {
    let provisioner = `${ this.value.provisioner || LONGHORN_DRIVER }`;

    if (provisioner === LONGHORN_DRIVER) {
      provisioner = `${ provisioner }_${ this.value.provisionerVersion || LONGHORN_VERSION_V1 }`;
    }

    return {
      provisioner,
      volumeGroupDialog: null,
      randomStr:         randomStr(10).toLowerCase(),
      isOpen:            false
    };
  },

  computed: {
    provisioners() {
      const out = [];

      const inStore = this.$store.getters['currentProduct'].inStore;
      const csiDrivers = this.$store.getters[`${ inStore }/all`](CSI_DRIVER) || [];

      csiDrivers.forEach(({ name }) => {
        switch (name) {
        case LONGHORN_DRIVER:
          out.push({
            label: `harvester.host.disk.storage.longhorn.${ LONGHORN_VERSION_V1 }.label`,
            value: `${ name }_${ LONGHORN_VERSION_V1 }`,
          });

          if (this.longhornSystemVersion === LONGHORN_VERSION_V2 || this.value.provisionerVersion === LONGHORN_VERSION_V2) {
            out.push({
              label:    `harvester.host.disk.storage.longhorn.${ LONGHORN_VERSION_V2 }.label`,
              value:    `${ name }_${ LONGHORN_VERSION_V2 }`,
              disabled: this.forceLonghornV1
            });
          }
          break;
        case LVM_DRIVER:
          out.push({
            label: 'harvester.host.disk.storage.lvm.label',
            value: name,
          });
          break;
        }
      });

      return out;
    },

    lvmVolumeGroups() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const lvmVolumeGroups = this.$store.getters[`${ inStore }/all`](HCI.LVM_VOLUME_GROUP) || [];

      const out = lvmVolumeGroups.filter(group => group.spec.nodeName === this.node.name).map(g => g.spec.vgName);

      out.unshift({
        label: this.t('harvester.host.disk.lvmVolumeGroup.create'),
        value: _NEW,
      });

      return out;
    },

    targetDisk() {
      return this.disks.find(disk => disk.name === this.value.name);
    },

    schedulableTooltipMessage() {
      const { name, path } = this.value;

      if (this.targetDisk && !this.targetDisk.allowScheduling && name && path) {
        return this.t('harvester.host.disk.allowScheduling.tooltip', { name, path });
      } else {
        return this.schedulableCondition.message;
      }
    },

    allowSchedulingOptions() {
      return [{
        label: this.t('generic.enabled'),
        value: true,
      }, {
        label: this.t('generic.disabled'),
        value: false,
      }];
    },

    evictionRequestedOptions() {
      return [{
        label: this.t('generic.yes'),
        value: true,
      }, {
        label: this.t('generic.no'),
        value: false,
      }];
    },

    mountedMessage() {
      const state = this.blockDevice?.metadata?.state || {};

      if (state?.error) {
        return state?.message;
      } else {
        return '';
      }
    },

    isProvisioned() {
      return this.blockDevice?.isProvisioned;
    },

    forceFormattedDisabled() {
      const lastFormattedAt = this.blockDevice?.status?.deviceStatus?.fileSystem?.LastFormattedAt;
      const fileSystem = this.blockDevice?.status?.deviceStatus?.fileSystem.type;

      const systems = ['ext4', 'XFS'];

      if (lastFormattedAt || this.blockDevice?.childParts?.length > 0) {
        return true;
      } else if (systems.includes(fileSystem)) {
        return false;
      } else if (!fileSystem) {
        return true;
      } else {
        return !this.canEditPath;
      }
    },

    canEditPath() {
      if (this.mountedMessage) {
        return true;
      }

      if (this.value.isNew && !this.value.originPath) {
        return true;
      }

      return false;
    },

    isFormatted() {
      return !!this.blockDevice?.status?.deviceStatus?.fileSystem?.LastFormattedAt;
    },

    formattedBannerLabel() {
      const system = this.blockDevice?.status?.deviceStatus?.fileSystem?.type;

      const label = this.t('harvester.host.disk.lastFormattedAt.info');

      if (system) {
        return `${ label } ${ this.t('harvester.host.disk.fileSystem.info', { system }) }`;
      } else {
        return label;
      }
    },

    provisionPhase() {
      return this.blockDevice?.provisionPhase || {};
    },

    blockDevice() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const name = this.value?.name;

      return this.$store.getters[`${ inStore }/byId`](HCI.BLOCK_DEVICE, `${ LONGHORN_SYSTEM }/${ name }`) || {};
    },

    isCorrupted() {
      return this.blockDevice?.status?.deviceStatus?.fileSystem?.corrupted;
    },

    isFormatting() {
      return this.blockDevice.isFormatting;
    },

    longhornSystemVersion() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const v2DataEngine = this.$store.getters[`${ inStore }/byId`](LONGHORN.SETTINGS, LONGHORN_V2_DATA_ENGINE) || {};

      return v2DataEngine.value === 'true' ? LONGHORN_VERSION_V2 : LONGHORN_VERSION_V1;
    },

    forceLonghornV1() {
      return this.node?.labels[HCI_LABELS_ANNOTATIONS.DISABLE_LONGHORN_V2_ENGINE] === 'true';
    },

    isLvm() {
      return this.value.provisioner === LVM_DRIVER;
    },

    isLonghorn() {
      return this.value.provisioner === LONGHORN_DRIVER;
    },

    isLonghornV1() {
      return this.isLonghorn && this.value.provisionerVersion === LONGHORN_VERSION_V1;
    },

    provisionerTooltip() {
      if (
        this.mode === _EDIT &&
        this.isLonghorn &&
        this.longhornSystemVersion === LONGHORN_VERSION_V2 &&
        this.forceLonghornV1
      ) {
        return this.t('harvester.storage.storageClass.longhorn.versionTooltip');
      }

      return null;
    }
  },

  watch: {
    provisioner(value) {
      this.randomStr = randomStr(10).toLowerCase();

      const [provisioner, provisionerVersion] = value?.split('_');

      this.value.provisioner = provisioner;

      if (provisioner === LONGHORN_DRIVER) {
        this.value.provisionerVersion = provisionerVersion || LONGHORN_VERSION_V1;
      } else {
        this.value.provisionerVersion = undefined;
      }
    },

    'value.lvmVolumeGroup'(neu) {
      if (neu === _NEW) {
        this.value.lvmVolumeGroup = null;
        this.showCreateVolumeGroup();
      }
    }
  },

  methods: {
    showCreateVolumeGroup() {
      this.volumeGroupDialog = null;
      this.isOpen = true;
    },

    hideCreateVolumeGroup() {
      this.isOpen = false;
    },

    saveCreateVolumeGroup(buttonCb) {
      buttonCb(true);
      this.value.lvmVolumeGroup = this.volumeGroupDialog;
      this.hideCreateVolumeGroup();
    },

    update() {
      this.$emit('input', this.value);
    },
  },
};
</script>

<template>
  <div class="disk" @input="update">
    <div class="mt-10" />
    <Banner
      v-if="mountedMessage && isProvisioned"
      color="error"
      :label="mountedMessage"
    />
    <Banner
      v-if="isFormatting"
      color="info"
      :label="t('harvester.host.disk.fileSystem.formatting')"
    />
    <Banner
      v-else-if="isFormatted && isLonghornV1 && !isCorrupted"
      color="info"
      :label="formattedBannerLabel"
    />
    <div v-if="!value.isNew">
      <div class="row">
        <div class="col span-12">
          <Tags
            v-model="value.tags"
            :label="t('harvester.host.disk.tags.label')"
            :add-label="t('harvester.host.disk.tags.addLabel')"
            :mode="mode"
          />
        </div>
      </div>
      <div class="row mt-10">
        <div class="col span-12">
          <div class="pull-left">
            <RadioGroup
              v-model="value.allowScheduling"
              name="diskScheduling"
              :label="t('harvester.host.disk.allowScheduling.label')"
              :mode="mode"
              :options="allowSchedulingOptions"
              :row="true"
            />
          </div>
          <div class="pull-right">
            {{ t('harvester.host.disk.conditions') }}:
            <BadgeState
              v-clean-tooltip="readyCondition.message"
              :color="readyCondition.status === 'True' ? 'bg-success' : 'bg-error' "
              :icon="readyCondition.status === 'True' ? 'icon-checkmark' : 'icon-warning' "
              label="Ready"
              class="mr-10 ml-10 state"
            />
            <BadgeState
              v-clean-tooltip="schedulableTooltipMessage"
              :color="schedulableCondition.status === 'True' && targetDisk?.allowScheduling ? 'bg-success' : 'bg-error' "
              :icon="schedulableCondition.status === 'True' && targetDisk?.allowScheduling ? 'icon-checkmark' : 'icon-warning' "
              label="Schedulable"
              class="mr-10 state"
            />
            <BadgeState
              v-if="provisionPhase.label"
              :color="provisionPhase.color"
              :icon="provisionPhase.icon"
              :label="provisionPhase.label"
              class="mr-10 state"
            />
          </div>
        </div>
      </div>
      <div v-if="!value.isNew" class="row mt-30">
        <div class="col flex span-12">
          <LabelValue
            :name="t('harvester.host.disk.storageAvailable.label')"
            :value="value.storageAvailable"
          />
          <LabelValue
            :name="t('harvester.host.disk.storageScheduled.label')"
            :value="value.storageScheduled"
          />
          <LabelValue
            :name="t('harvester.host.disk.storageMaximum.label')"
            :value="value.storageMaximum"
          />
        </div>
      </div>
      <hr class="mt-10" />
    </div>
    <div class="row mt-10">
      <div class="col span-12">
        <LabeledInput
          v-model="value.displayName"
          :label="t('generic.name')"
          :disabled="true"
        />
      </div>
    </div>

    <div class="row mt-10">
      <div :class="`col span-${ value.isNew ? '6': '12' }`">
        <LabeledSelect
          v-model="provisioner"
          :mode="mode"
          label-key="harvester.host.disk.provisioner"
          :localized-label="true"
          :searchable="true"
          :options="provisioners"
          :disabled="isProvisioned || !value.isNew"
          :tooltip="provisionerTooltip"
          @keydown.native.enter.prevent="()=>{}"
        />
      </div>
      <div v-if="(value.isNew && isLonghornV1 && !isFormatted) || isCorrupted" class="col span-6">
        <RadioGroup
          v-model="value.forceFormatted"
          :mode="mode"
          name="forceFormatted"
          label-key="harvester.host.disk.forceFormatted.label"
          :labels="[t('generic.no'),t('harvester.host.disk.forceFormatted.yes')]"
          :options="[false, true]"
          :disabled="forceFormattedDisabled"
          tooltip-key="harvester.host.disk.forceFormatted.toolTip"
        >
          <template #1="{option, listeners}">
            <RadioButton
              :label="option.label"
              :val="option.value"
              :value="value.forceFormatted"
              :disabled="forceFormattedDisabled && !value.forceFormatted"
              v-on="listeners"
            />
          </template>
        </RadioGroup>
      </div>
      <div v-if="value.isNew && isLvm" class="col span-6">
        <LabeledSelect
          v-model="value.lvmVolumeGroup"
          :mode="mode"
          label-key="harvester.host.disk.lvmVolumeGroup.label"
          :localized-label="true"
          :searchable="false"
          :taggable="true"
          :multiple="false"
          :required="true"
          :disabled="isProvisioned"
          :options="lvmVolumeGroups"
          @keydown.native.enter.prevent="()=>{}"
        />
      </div>
    </div>
    <ModalWithCard
      v-if="isOpen"
      :ref="randomStr"
      :name="randomStr"
      width="30%"
      @finish="saveCreateVolumeGroup"
      @close="hideCreateVolumeGroup"
    >
      <template #title>
        {{ t('harvester.host.disk.lvmVolumeGroup.label') }}
      </template>

      <template #content>
        <LabeledInput
          v-model="volumeGroupDialog"
          :label="t('generic.name')"
          class="mb-20"
          required
          @keydown.native.enter.prevent="()=>{}"
        />
      </template>
    </ModalWithCard>
  </div>
</template>

<style lang="scss" scoped>
.close {
  top: 10px;
  right: 10px;
  padding:0;
  position: absolute;
}

.disk {
  position: relative;

  .secret-name {
    height: $input-height;
  }

  &:not(:last-of-type) {
    padding-bottom: 10px;
    margin-bottom: 30px;
  }
}

.flex {
  display: flex;
  justify-content: space-between;
}

.badge-state {
    padding: 2px 5px;
}
</style>
