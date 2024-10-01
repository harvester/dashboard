<script>
import { _EDIT } from '@shell/config/query-params';
import { allHash } from '@shell/utils/promise';
import { HCI } from '../../../types';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import Banner from '@components/Banner/Banner.vue';
import VGpuDeviceList from './VGpuDeviceList';

import remove from 'lodash/remove';
import { set } from '@shell/utils/object';
import { uniq } from '@shell/utils/array';

export default {
  name:       'VirtualMachineVGpuDevices',
  components: {
    Banner,
    LabeledSelect,
    VGpuDeviceList
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
      devices: this.$store.dispatch('harvester/findAll', { type: HCI.VGPU_DEVICE }),
      vms:     this.$store.dispatch(`harvester/findAll`, { type: HCI.VM })
    };

    const res = await allHash(hash);

    for (const key in res) {
      this[key] = res[key];
    }

    uniq([
      ...(this.value?.domain?.devices?.gpus || []).map(({ name }) => name),
      ...Object.values(this.vm?.provisionedVGpus).reduce((acc, gpus) => [...acc, ...gpus], [])
    ]).forEach((name) => {
      if (this.enabledDevices.find(device => device?.metadata?.name === name)) {
        this.selectedDevices.push(name);
      }
    });
  },

  data() {
    return {
      deviceSchema:    this.$store.getters['harvester/schemaFor'](HCI.VGPU_DEVICE),
      devices:         [],
      vms:             [],
      selectedDevices: [],
    };
  },

  watch: {
    selectedDevices(neu) {
      const formatted = neu.map((selectedDevice) => {
        const deviceCRD = this.enabledDevices.find(device => device.metadata.name === selectedDevice);
        const deviceName = `nvidia.com/${ deviceCRD?.status?.configureVGPUTypeName?.replace(/\s+/g, '_') }`;

        return {
          deviceName,
          name: deviceCRD?.metadata.name,
        };
      });

      set(this.value.domain.devices, 'gpus', formatted);
    }
  },

  computed: {
    enabledDevices() {
      return this.devices.filter((device) => {
        return device.isEnabled;
      }) || [];
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
        const nodeName = device.spec?.nodeName;

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

          return device.spec.nodeName !== nodeName;
        });
      });

      return out;
    },

    deviceOpts() {
      const filteredOptions = this.enabledDevices.filter((deviceCRD) => {
        if (this.selectedDevices.length > 0) {
          const selectedDevice = this.enabledDevices.find(device => device.metadata.name === this.selectedDevices[0]);

          return !this.devicesInUse[deviceCRD?.metadata.name] && deviceCRD.spec.nodeName === selectedDevice.spec.nodeName;
        }

        return !this.devicesInUse[deviceCRD?.metadata.name];
      });

      return filteredOptions.map((deviceCRD) => {
        return {
          value: deviceCRD?.metadata.name,
          label: deviceCRD?.metadata.name,
        };
      });
    },
  },
};
</script>

<template>
  <div>
    <div class="row">
      <div class="col span-12">
        <Banner color="info">
          <t k="harvester.vgpu.howToUseDevice" />
        </Banner>
        <Banner v-if="selectedDevices.length > 0" color="info">
          <t k="harvester.vgpu.deviceInTheSameHost" />
        </Banner>
      </div>
    </div>
    <template v-if="enabledDevices.length">
      <div class="row">
        <div class="col span-6">
          <LabeledSelect
            v-model="selectedDevices"
            label="Available vGPU Devices"
            searchable
            multiple
            taggable
            :options="deviceOpts"
            :mode="mode"
          >
            <template #option="option">
              <span>{{ option.value }}</span>
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
        {{ t('harvester.vgpu.impossibleSelection') }}
      </div>
    </template>
    <div class="row mt-20">
      <div class="col span-12">
        <VGpuDeviceList :schema="deviceSchema" :devices="devices" @submit.prevent />
      </div>
    </div>
  </div>
</template>
