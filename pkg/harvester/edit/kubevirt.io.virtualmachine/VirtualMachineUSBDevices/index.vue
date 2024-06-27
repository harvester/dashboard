<script>
import { _EDIT } from '@shell/config/query-params';
import { allHash } from '@shell/utils/promise';
import { HCI } from '../../../types';
import { STATE, SIMPLE_NAME } from '@shell/config/table-headers';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import Banner from '@components/Banner/Banner.vue';

export default {
  name:       'VirtualMachineUSBDevices',
  components: {
    Banner,
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
  },

  data() {
    return {
      deviceSchema:    this.$store.getters['harvester/schemaFor'](HCI.USB_DEVICE),
      deviceHeaders: [
        { ...STATE },
        SIMPLE_NAME,
      ],
      devices:         [],
      vms:             [],
      selectedDevices: [],
    };
  },

  computed: {
  },
};
</script>

<template>
  <div> USB Devices </div>
</template>
