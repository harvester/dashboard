<script>
import { _EDIT } from '@shell/config/query-params';
import { allHash } from '@shell/utils/promise';
import { HCI } from '../../../types';
import { STATE, SIMPLE_NAME } from '@shell/config/table-headers';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import Banner from '@components/Banner/Banner.vue';
import CompatibilityMatrix from '../CompatibilityMatrix';
import DeviceList from './DeviceList';

import remove from 'lodash/remove';
import { set } from '@shell/utils/object';

export default {
  name:       'VirtualMachineUSBDevices',
  components: {
    Banner,
    CompatibilityMatrix,
    DeviceList,
    LabeledSelect,
  },
  props: {
    mode: {
      type:    String,
      default: _EDIT
    },

    value: {
      type:    Object,
      default: () => {}
    },

    vm: {
      type:    Object,
      default: () => {}
    }
  },

  async fetch() {
    const hash = {
      devices: this.$store.dispatch('harvester/findAll', { type: HCI.USB_DEVICE }),
      vms:     this.$store.dispatch(`harvester/findAll`, { type: HCI.VM })
    };

    const res = await allHash(hash);

    for (const key in res) {
      this[key] = res[key];
    }

    this.selectedDevices = (this.value?.domain?.devices?.hostDevices || [])
      .map(({ name }) => name)
      .filter(name => this.enabledDevices.find(device => device?.metadata?.name === name));
  },

  data() {
    return {
      deviceSchema:  this.$store.getters['harvester/schemaFor'](HCI.USB_DEVICE),
      deviceHeaders: [
        { ...STATE },
        SIMPLE_NAME,
      ],
      devices:         [],
      vms:             [],
      selectedDevices: [],
      showMatrix:      false,
    };
  },

  watch: {
    selectedDevices(neu) {
      const formatted = neu.map((selectedDevice) => {
        const deviceCRD = this.enabledDevices.find(device => device.metadata.name === selectedDevice);
        const deviceName = deviceCRD?.status?.resourceName;

        return {
          deviceName,
          name: deviceCRD?.metadata.name,
        };
      });

      const devices = [
        ...this.otherDevices(this.value.domain.devices.hostDevices || []),
        ...formatted,
      ];

      set(this.value.domain.devices, 'hostDevices', devices);
    }
  },

  computed: {
    deviceOpts() {
      const filteredOptions = this.enabledDevices.filter((deviceCRD) => {
        if (this.selectedDevices.length > 0) {
          const selectedDevice = this.enabledDevices.find(device => device.metadata.name === this.selectedDevices[0]);

          return !this.devicesInUse[deviceCRD?.metadata.name] && deviceCRD.status.nodeName === selectedDevice?.status.nodeName;
        }

        return !this.devicesInUse[deviceCRD?.metadata.name];
      });

      return filteredOptions.map((deviceCRD) => {
        return {
          value:        deviceCRD?.metadata.name,
          label:        deviceCRD?.metadata.name,
          displayLabel: deviceCRD?.status?.description,
        };
      });
    },

    enabledDevices() {
      return this.devices.filter((device) => {
        return device.status.enabled;
      });
    },

    devicesInUse() {
      const inUse = this.vms.reduce((inUse, vm) => {
        if (vm.metadata.name === this.vm?.metadata?.name) {
          return inUse;
        }

        vm.hostDevices.forEach((device) => {
          inUse[device.name] = { usedBy: [vm.metadata.name] };
        });

        return inUse;
      }, {});

      return inUse;
    },

    devicesByNode() {
      return this.enabledDevices?.reduce((acc, device) => {
        const nodeName = device.status?.nodeName;

        if (nodeName) {
          if (!acc[nodeName]) {
            acc[nodeName] = [];
          } else {
            acc[nodeName].push(device);
          }
        }

        return acc;
      }, {});
    },

    compatibleNodes() {
      const out = [...Object.keys(this.devicesByNode)];

      this.selectedDevices.forEach((deviceUid) => {
        remove(out, (nodeName) => {
          const device = this.enabledDevices.find(deviceCRD => deviceCRD.metadata.name === deviceUid);

          return device?.status.nodeName !== nodeName;
        });
      });

      return out;
    },
  },

  methods: {
    otherDevices(vmDevices) {
      return vmDevices.filter(device => !this.devices.find(usb => device.name === usb.name));
    }
  }
};
</script>

<template>
  <div>
    <div class="row">
      <div class="col span-12">
        <Banner color="info">
          <t k="harvester.usb.howToUseDevice" />
        </Banner>
        <Banner v-if="selectedDevices.length > 0" color="info">
          <t k="harvester.usb.deviceInTheSameHost" />
        </Banner>
      </div>
    </div>
    <template v-if="enabledDevices.length">
      <div class="row">
        <div class="col span-6">
          <LabeledSelect
            v-model="selectedDevices"
            :label="t('harvester.usb.available')"
            searchable
            multiple
            taggable
            :options="deviceOpts"
            :mode="mode"
          >
            <template #option="option">
              <span>{{ option.value }} <span class="text-label">({{ option.displayLabel }})</span></span>
            </template>
          </LabeledSelect>
        </div>
      </div>
      <div v-if="compatibleNodes.length && selectedDevices.length" class="row">
        <div class="col span-12 text-muted">
          Compatible hosts:
          <!-- eslint-disable-next-line vue/no-parsing-error -->
          <span v-for="(node, idx) in compatibleNodes" :key="node">{{ node }}{{ idx < compatibleNodes.length-1 ? ', ' : '' }}</span>
        </div>
      </div>
      <div v-else-if="selectedDevices.length" class="text-error">
        {{ t('harvester.usb.impossibleSelection') }}
      </div>
      <button type="button" class="btn btn-sm role-link pl-0" @click="e=>{showMatrix = !showMatrix; e.target.blur()}">
        {{ showMatrix ? t('harvester.usb.hideCompatibility') : t('harvester.usb.showCompatibility') }}
      </button>
      <div v-if="showMatrix" class="row mt-20">
        <div class="col span-12">
          <CompatibilityMatrix :enabled-devices="enabledDevices" :devices-by-node="devicesByNode" :devices-in-use="devicesInUse" />
        </div>
      </div>
    </template>
    <div class="row mt-20">
      <div class="col span-12">
        <DeviceList :schema="deviceSchema" :devices="devices" @submit.prevent />
      </div>
    </div>
  </div>
</template>
