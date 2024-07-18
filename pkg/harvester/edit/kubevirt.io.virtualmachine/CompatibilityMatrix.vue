<script>
import { mapGetters } from 'vuex';
export default {
  props: {
    /**
     * deviceId/vendorId is unique per type of device - there may be multiple CRD objects for a given device
     * {
     *  [deviceId/vendorId]: {
     *      nodes: array of devicecrd.status.nodeName's for given device,
     *      deviceCRDs: array of all instances of given device
     *      }
     * }
     */
    enabledDevices: {
      type:     Array,
      required: true
    },
    /**
 * {
 *  [node name]: [devices]
 * }
 */
    devicesByNode: {
      type:     Object,
      required: true
    },

    /**
 * {
 *  [deviceCRD.status.resourceName]: {
 *      count: number of this device in use by other vms
 *      usedBy: [names of all vms using this device]
 *    }
 * }
 */

    devicesInUse: {
      type:    Object,
      default: () => {}
    }
  },

  computed: {
    ...mapGetters({ t: 'i18n/t' }),
    allNodeNames() {
      return Object.keys(this.devicesByNode);
    },

    allDeviceIds() {
      return Object.keys(this.uniqueDevices);
    }
  },

  methods: {
    nodeNameFromId(id) {
      return this.devicesByNode[id]?.name;
    },

    nodeHasDevice(nodeName, deviceCRD) {
      return deviceCRD.status.nodeName === nodeName;
    },

    noneAvailable(deviceCRD) {
      const name = deviceCRD.metadata?.name;

      return !!this.devicesInUse[name];
    },

    deviceTooltip(deviceCRD) {
      return `${ deviceCRD?.status?.resourceName }<br/>${ deviceCRD?.status?.description }`;
    }
  }
};
</script>

<template>
  <div class="compat-matrix">
    <div class="device-col node-names">
      <div class="blank-corner">
        <div class="text-right">
          {{ t('harvester.devices.matrixDeviceClaimName') }}
        </div>
        <div>{{ t('harvester.devices.matrixHostName') }}</div>
      </div>
      <div v-for="nodeName in allNodeNames" :key="nodeName" class="node-label">
        <span>  {{ nodeName }}</span>
      </div>
    </div>
    <div v-for="deviceCRD in enabledDevices" :key="deviceCRD.metadata.name" class="device-col">
      <div v-clean-tooltip="deviceTooltip(deviceCRD)" class="compat-cell device-label" :class="{'text-muted': noneAvailable(deviceCRD)}">
        {{ deviceCRD.metadata.name }}
      </div>
      <div
        v-for="nodeName in allNodeNames"
        :key="nodeName"
        class="compat-cell"
        :class="{'has-device': nodeHasDevice(nodeName, deviceCRD)}"
      />
    </div>
  </div>
</template>

<style lang='scss'>
.compat-matrix {
    display: flex;
}

.device-col {
    display: flex;
    flex-direction: column;

    border-right: 1px solid var(--border);

    &>*{
        border-bottom: 1px solid var(--border);
    }
}

.compat-cell {
    flex-basis: 1em;
    padding: 0px 10px 0px 10px;

    &.has-device {
        background-color: var(--info-banner-bg);
    }
}

.node-label, .device-label {
    display: flex;
    align-items: center;
    color: var(--input-label);
}

.node-label{
    padding: 0 10px;
    justify-content: center;
}

.node-label, .device-label, .compat-cell, .blank-corner {
    flex-basis: calc(2em + 10px);
}

.blank-corner {
  background: linear-gradient(
              to top right,
              #fff 0%,
              #fff calc(50% - 1px),
                var(--body-text) 50%,
              #fff calc(50% + 1px),
              #fff 100%
           );

  DIV.text-right {
    padding-left: 80px;
  }
}
</style>
