<script>
import { HCI } from '../types';
import { allHash } from '@shell/utils/promise';
import Banner from '@components/Banner/Banner.vue';
import Loading from '@shell/components/Loading';
import MessageLink from '@shell/components/MessageLink';
import { ADD_ONS } from '../config/harvester-map';
import DeviceList from '../edit/kubevirt.io.virtualmachine/VirtualMachineUSBDevices/DeviceList';

export default {
  name: 'ListUsbDevicePage',

  components: {
    Banner,
    DeviceList,
    Loading,
    MessageLink,
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;

    this.schema = this.$store.getters[`${ inStore }/schemaFor`](HCI.USB_DEVICE);
    this.hasAddonSchema = this.$store.getters[`${ inStore }/schemaFor`](HCI.ADD_ONS);

    if (this.hasSchema) {
      try {
        const hash = await allHash({
          usbDevices: this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.USB_DEVICE }),
          addons:     this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.ADD_ONS }),
        });

        this.hasPCIAddon = hash.addons.find(addon => addon.name === ADD_ONS.PCI_DEVICE_CONTROLLER)?.spec?.enabled === true;
      } catch (e) {}
    }
  },

  data() {
    return {
      hasAddonSchema: false,
      hasPCIAddon:    false,
      schema:         null,
      toPciAddon:     `${ HCI.ADD_ONS }/harvester-system/${ ADD_ONS.PCI_DEVICE_CONTROLLER }?mode=edit`,
    };
  },

  computed: {
    hasSchema() {
      return !!this.schema;
    },

    devices() {
      const inStore = this.$store.getters['currentProduct'].inStore;

      return this.$store.getters[`${ inStore }/all`](HCI.USB_DEVICE) || [];
    }
  },

  typeDisplay() {
    return this.t('harvester.usb.label');
  }
};
</script>

<template>
  <Loading v-if="$fetchState.pending" />
  <div v-else-if="!hasAddonSchema">
    <Banner color="warning">
      {{ t('harvester.usb.noPermission') }}
    </Banner>
  </div>
  <div v-else-if="!hasPCIAddon">
    <Banner color="warning">
      <MessageLink
        :to="toPciAddon"
        prefix-label="harvester.usb.goSetting.prefix"
        middle-label="harvester.usb.goSetting.middle"
        suffix-label="harvester.usb.goSetting.suffix"
      />
    </Banner>
  </div>
  <DeviceList v-else-if="hasSchema" :devices="devices" :schema="schema" />
</template>
