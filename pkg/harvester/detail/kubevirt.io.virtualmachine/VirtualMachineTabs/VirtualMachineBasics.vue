<script>
import HarvesterIpAddress from '../../../formatters/HarvesterIpAddress';
import VMConsoleBar from '../../../components/VMConsoleBar';
import LabelValue from '@shell/components/LabelValue';
import InputOrDisplay from '@shell/components/InputOrDisplay';
import { HCI } from '../../../types';
import CreateEditView from '@shell/mixins/create-edit-view';

const UNDEFINED = 'n/a';

export default {
  name: 'VMDetailsBasics',

  components: {
    VMConsoleBar,
    HarvesterIpAddress,
    LabelValue,
    InputOrDisplay
  },

  mixins: [CreateEditView],

  props: {
    value: {
      type:     Object,
      required: true
    },
    vmi: {
      type:     Object,
      required: true,
      default:  () => {
        return {};
      }
    },
    mode: {
      type:     String,
      required: true,
    },
  },

  computed: {
    creationTimestamp() {
      const date = new Date(this.value?.metadata?.creationTimestamp);

      if (!date.getMonth) {
        return UNDEFINED;
      }

      return `${ date.getMonth() + 1 }/${ date.getDate() }/${ date.getUTCFullYear() }`;
    },

    node() {
      const node = this.vmi?.status?.nodeName || UNDEFINED;

      return this.isDown ? this.t('harvester.virtualMachine.detail.details.down') : node;
    },

    hostname() {
      const hostName = this.vmi?.spec?.hostname || this.vmi?.status?.guestOSInfo?.hostname || this.t('harvester.virtualMachine.detail.GuestAgentNotInstalled');

      return this.isDown ? this.t('harvester.virtualMachine.detail.details.down') : hostName;
    },

    imageName() {
      const imageList = this.$store.getters['harvester/all'](HCI.IMAGE) || [];
      const image = imageList.find( I => this.value.rootImageId === I.id);

      return image?.spec?.displayName || 'N/A';
    },

    disks() {
      const disks = this.value?.spec?.template?.spec?.domain?.devices?.disks || [];

      return disks.filter((disk) => {
        return !!disk.bootOrder;
      }).sort((a, b) => {
        if (a.bootOrder < b.bootOrder) {
          return -1;
        }

        return 1;
      });
    },

    cdroms() {
      const disks = this.value?.spec?.template?.spec?.domain?.devices?.disks || [];

      return disks.filter((disk) => {
        return !!disk.cdrom;
      });
    },

    flavor() {
      const domain = this.value?.spec?.template?.spec?.domain;

      return `${ domain.cpu?.cores } vCPU , ${ domain.resources?.limits?.memory } ${ this.t('harvester.virtualMachine.input.memory') }`;
    },

    kernelRelease() {
      const kernelRelease = this.vmi?.status?.guestOSInfo?.kernelRelease || this.t('harvester.virtualMachine.detail.GuestAgentNotInstalled');

      return this.isDown ? this.t('harvester.virtualMachine.detail.details.down') : kernelRelease;
    },

    operatingSystem() {
      const operatingSystem = this.vmi?.status?.guestOSInfo?.prettyName || this.t('harvester.virtualMachine.detail.GuestAgentNotInstalled');

      return this.isDown ? this.t('harvester.virtualMachine.detail.details.down') : operatingSystem;
    },

    isDown() {
      return this.isEmpty(this.vmi);
    },

    machineType() {
      return this.value?.spec?.template?.spec?.domain?.machine?.type || undefined;
    }
  },

  methods: {
    getDeviceType(o) {
      if (o.disk) {
        return 'Disk';
      } else {
        return 'CD-ROM';
      }
    },
    isEmpty(o) {
      return o !== undefined && Object.keys(o).length === 0;
    }
  }
};
</script>

<template>
  <div>
    <VMConsoleBar :resource="value" class="consoleBut" />
    <div class="overview-basics">
      <div class="row">
        <div class="col span-6">
          <LabelValue :name="t('harvester.virtualMachine.detail.details.name')" :value="value.nameDisplay">
            <template #value>
              <div class="smart-row">
                <div class="console">
                  {{ value.nameDisplay }}
                </div>
              </div>
            </template>
          </LabelValue>
        </div>
        <div class="col span-6">
          <LabelValue :name="t('harvester.fields.image')" :value="imageName" />
        </div>
      </div>

      <div class="row">
        <div class="col span-6">
          <LabelValue :name="t('harvester.virtualMachine.detail.details.hostname')" :value="hostname">
            <template #value>
              <div>
                {{ hostname }}
              </div>
            </template>
          </LabelValue>
        </div>

        <div class="col span-6">
          <LabelValue :name="t('harvester.virtualMachine.detail.details.node')" :value="node">
            <template #value>
              <div>
                {{ node }}
              </div>
            </template>
          </LabelValue>
        </div>
      </div>

      <div class="row">
        <div class="col span-6">
          <LabelValue :name="t('harvester.virtualMachine.detail.details.ipAddress')">
            <template #value>
              <HarvesterIpAddress v-model="value.id" :row="value" />
            </template>
          </LabelValue>
        </div>

        <div class="col span-6">
          <LabelValue :name="t('harvester.virtualMachine.detail.details.created')" :value="creationTimestamp" />
        </div>
      </div>

      <hr class="section-divider" />

      <h2>{{ t('harvester.virtualMachine.detail.tabs.configurations') }}</h2>

      <div class="row">
        <div class="col span-6">
          <InputOrDisplay :name="t('harvester.virtualMachine.detail.details.bootOrder')" :value="disks" :mode="mode">
            <template #value>
              <ul>
                <li v-for="(disk) in disks" :key="disk.bootOrder">
                  {{ disk.bootOrder }}. {{ disk.name }} ({{ getDeviceType(disk) }})
                </li>
              </ul>
            </template>
          </InputOrDisplay>
        </div>
        <div class="col span-6">
          <InputOrDisplay :name="t('harvester.virtualMachine.detail.details.CDROMs')" :value="cdroms" :mode="mode">
            <template #value>
              <div>
                <ul v-if="cdroms.length > 0">
                  <li v-for="(rom) in cdroms" :key="rom.name">
                    {{ rom.name }}
                  </li>
                </ul>
                <span v-else>
                  {{ t("harvester.virtualMachine.detail.notAvailable") }}
                </span>
              </div>
            </template>
          </InputOrDisplay>
        </div>
      </div>
      <div class="row">
        <div class="col span-6">
          <LabelValue :name="t('harvester.virtualMachine.detail.details.operatingSystem')" :value="operatingSystem" />
        </div>
        <LabelValue :name="t('harvester.virtualMachine.detail.details.flavor')" :value="flavor" />
      </div>
      <div class="row">
        <div class="col span-6">
          <LabelValue :name="t('harvester.virtualMachine.detail.details.kernelRelease')" :value="kernelRelease" />
        </div>

        <div class="col span-6">
          <LabelValue :name="t('harvester.virtualMachine.input.MachineType')" :value="machineType" />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .consoleBut {
    display: flex;
    justify-content: flex-end;
  }

  .overview-basics {
    display: grid;
    grid-template-columns: 100%;
    grid-template-rows: auto;
    grid-row-gap: 15px;

    .badge-state {
      padding: 2px 5px;
      font-size: 12px;
      margin-right: 3px;
    }

    .smart-row {
      display: flex;
      flex-direction: row;

      .console {
        display: flex;
        overflow: hidden;
      }
    }

    &__name {
      flex: 1;
    }

    &__ssh-key {
      min-width: 150px;
    }
  }
</style>
