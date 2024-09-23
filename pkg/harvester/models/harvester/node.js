import pickBy from 'lodash/pickBy';
import { CAPI, LONGHORN, POD, NODE } from '@shell/config/types';
import { HCI } from '../../types';
import { CAPI as CAPI_ANNOTATIONS } from '@shell/config/labels-annotations.js';
import { HCI as HCI_ANNOTATIONS } from '@pkg/harvester/config/labels-annotations';
import { clone } from '@shell/utils/object';
import findLast from 'lodash/findLast';
import {
  colorForState,
  stateDisplay,
  STATES_ENUM,
} from '@shell/plugins/dashboard-store/resource-class';
import { parseSi } from '@shell/utils/units';
import HarvesterResource from '../harvester';
import { PRODUCT_NAME as HARVESTER_PRODUCT } from '../../config/harvester';
import { findBy, isArray } from '@shell/utils/array';

import { ucFirst } from '@shell/utils/string';

const ALLOW_SYSTEM_LABEL_KEYS = [
  'topology.kubernetes.io/zone',
  'topology.kubernetes.io/region',
];

const HEALTHY = 'healthy';
const WARNING = 'warning';

export default class HciNode extends HarvesterResource {
  get _availableActions() {
    const cordon = {
      action:  'cordon',
      enabled: this.hasAction('cordon') && !this.isCordoned,
      icon:    'icon icon-fw icon-pause',
      label:   this.t('harvester.action.cordon'),
      total:   1
    };

    const uncordon = {
      action:  'uncordon',
      enabled: this.hasAction('uncordon'),
      icon:    'icon icon-fw icon-play',
      label:   this.t('harvester.action.uncordon'),
      total:   1
    };

    const enableMaintenance = {
      action:  'enableMaintenanceMode',
      enabled: this.hasAction('enableMaintenanceMode'),
      icon:    'icon icon-fw icon-unlock',
      label:   this.t('harvester.action.enableMaintenance'),
      total:   1
    };

    const disableMaintenance = {
      action:  'disableMaintenanceMode',
      enabled: this.hasAction('disableMaintenanceMode'),
      icon:    'icon icon-fw icon-lock',
      label:   this.t('harvester.action.disableMaintenance'),
      total:   1
    };

    const enableCPUManager = {
      action:  'enableCPUManager',
      enabled: this.hasAction('enableCPUManager') && !this.isCPUManagerEnableInProgress && !this.isCPUManagerEnabled && !this.isEtcd, // witness node doesn't have CPU manager
      icon:    'icon icon-fw icon-os-management',
      label:   this.t('harvester.action.enableCPUManager'),
      total:   1
    };

    const disableCPUManager = {
      action:  'disableCPUManager',
      enabled: this.hasAction('disableCPUManager') && !this.isCPUManagerEnableInProgress && this.isCPUManagerEnabled && !this.isEtcd,
      icon:    'icon icon-fw icon-os-management',
      label:   this.t('harvester.action.disableCPUManager'),
      total:   1
    };

    const shutDown = {
      action:  'shutDown',
      enabled: this.hasAction('powerActionPossible') && this.hasAction('powerAction') && !this.isStopped && !!this.inventory,
      icon:    'icon icon-fw icon-dot',
      label:   this.t('harvester.action.shutdown'),
      total:   1
    };

    const powerOn = {
      action:  'powerOn',
      enabled: this.hasAction('powerActionPossible') && this.hasAction('powerAction') && this.isStopped && !!this.inventory,
      icon:    'icon icon-fw icon-play',
      label:   this.t('harvester.action.powerOn'),
      total:   1
    };

    const reboot = {
      action:  'reboot',
      enabled: this.hasAction('powerActionPossible') && this.hasAction('powerAction') && !this.isStopped && !!this.inventory,
      icon:    'icon icon-fw icon-refresh',
      label:   this.t('harvester.action.reboot'),
      total:   1
    };

    return [
      cordon,
      uncordon,
      enableMaintenance,
      disableMaintenance,
      enableCPUManager,
      disableCPUManager,
      shutDown,
      powerOn,
      reboot,
      ...super._availableActions
    ];
  }

  promptRemove(resources = this) {
    this.$dispatch('promptModal', {
      resources,
      warningMessageKey: 'promptRemove.confirmRelatedResource',
      component:         'ConfirmRelatedToRemoveDialog'
    });
  }

  remove(resources = this) {
    const nodes = Array.isArray(resources) ? resources : [resources];

    nodes.forEach((node) => {
      if (node.capiMachine) {
        node.capiMachine.remove();
      } else {
        node.remove();
      }
    });
  }

  get capiMachine() {
    const namespace = this.annotations?.[CAPI_ANNOTATIONS.CLUSTER_NAMESPACE];
    const name = this.annotations?.[CAPI_ANNOTATIONS.MACHINE_NAME];

    if (namespace && name) {
      const inStore = this.$rootGetters['currentProduct'].inStore;

      return this.$rootGetters[`${ inStore }/byId`](CAPI.MACHINE, `${ namespace }/${ name }`);
    }

    return null;
  }

  get confirmRemove() {
    return true;
  }

  get consoleUrl() {
    const url = this.metadata?.annotations?.[HCI_ANNOTATIONS.HOST_CONSOLE_URL];
    const validator = /^[a-z]+:\/\//;

    if (!url?.match(validator)) {
      return false;
    }

    return url;
  }

  get filteredSystemLabels() {
    const reg = /(k3s|kubernetes|kubevirt|harvesterhci|k3os)+\.io/;

    const labels = pickBy(this.labels, (value, key) => {
      return !reg.test(key);
    });

    ALLOW_SYSTEM_LABEL_KEYS.map((key) => {
      const value = this?.metadata?.labels?.[key];

      if (value) {
        labels[key] = value;
      }
    });

    return labels;
  }

  get nameDisplay() {
    return (
      this.metadata?.annotations?.[HCI_ANNOTATIONS.HOST_CUSTOM_NAME] ||
      this.name
    );
  }

  get isKVMDisable() {
    const allNotExist = !this.metadata?.labels?.[HCI_ANNOTATIONS.KVM_AMD_CPU] && !this.metadata?.labels?.[HCI_ANNOTATIONS.KVM_INTEL_CPU];

    return this.metadata?.labels?.[HCI_ANNOTATIONS.KVM_AMD_CPU] === 'false' || this.metadata?.labels?.[HCI_ANNOTATIONS.KVM_INTEL_CPU] === 'false' || allNotExist;
  }

  get stateDisplay() {
    if (this.isEnteringMaintenance) {
      return 'Entering maintenance mode';
    }

    if (this.isStopping) {
      return ucFirst(STATES_ENUM.STOPPING);
    }

    if (this.isStarting) {
      return ucFirst(STATES_ENUM.STARTING);
    }

    if (this.isStopped) {
      return ucFirst(STATES_ENUM.OFF);
    }

    if (this.isRebooting) {
      return 'Rebooting';
    }

    if (this.isMaintenance) {
      return 'Maintenance';
    }

    if (this.isCordoned) {
      return 'Cordoned';
    }

    return stateDisplay(this.state);
  }

  get stateBackground() {
    if (this.isStopped || this.isStopping || this.isStarting || this.isRebooting) {
      return colorForState(
        this.stateDisplay,
        false,
        this.stateObj?.transitioning
      ).replace('text-', 'bg-');
    }

    return colorForState(
      this.stateDisplay,
      this.stateObj?.error,
      this.stateObj?.transitioning
    ).replace('text-', 'bg-');
  }

  get stateDescription() {
    const currentIP = this.metadata?.annotations?.[HCI_ANNOTATIONS.CURRENT_IP];
    const initIP = this.metadata?.annotations?.[HCI_ANNOTATIONS.INIT_IP];

    if (initIP && currentIP && currentIP !== initIP) {
      return this.t('harvester.host.inconsistentIP', { currentIP, initIP });
    }

    return super.stateDescription;
  }

  get stateObj() {
    const currentIP = this.metadata?.annotations?.[HCI_ANNOTATIONS.CURRENT_IP];
    const initIP = this.metadata?.annotations?.[HCI_ANNOTATIONS.INIT_IP];

    if (initIP && currentIP && currentIP !== initIP) {
      this.metadata.state.error = true;
    }

    return this.metadata?.state;
  }

  get detailLocation() {
    const detailLocation = clone(this._detailLocation);

    detailLocation.params.resource = HCI.HOST;

    return detailLocation;
  }

  get doneOverride() {
    const detailLocation = clone(this._detailLocation);

    delete detailLocation.params.namespace;
    delete detailLocation.params.id;
    detailLocation.params.resource = HCI.HOST;
    detailLocation.name = `${ HARVESTER_PRODUCT }-c-cluster-resource`;

    return detailLocation;
  }

  get parentNameOverride() {
    return this.$rootGetters['i18n/t'](`typeLabel."${ HCI.HOST }"`, { count: 1 })?.trim();
  }

  get parentLocationOverride() {
    return this.doneOverride;
  }

  get internalIp() {
    const addresses = this.status?.addresses || [];

    return findLast(addresses, address => address.type === 'InternalIP')
      ?.address;
  }

  get isMaster() {
    return (
      this.metadata?.labels?.[HCI_ANNOTATIONS.NODE_ROLE_MASTER] !== undefined ||
      this.metadata?.labels?.[HCI_ANNOTATIONS.NODE_ROLE_CONTROL_PLANE] !==
        undefined
    );
  }

  cordon() {
    this.doActionGrowl('cordon', {});
  }

  uncordon() {
    this.doAction('uncordon', {});
  }

  enableMaintenanceMode(resources = this) {
    this.$dispatch('promptModal', {
      resources,
      component: 'HarvesterMaintenanceDialog'
    });
  }

  disableMaintenanceMode() {
    this.doAction('disableMaintenanceMode', {});
  }

  enableCPUManager() {
    this.doActionGrowl('enableCPUManager', {});
  }

  disableCPUManager() {
    this.doActionGrowl('disableCPUManager', {});
  }

  get isUnSchedulable() {
    return (
      this.metadata?.labels?.[HCI_ANNOTATIONS.NODE_SCHEDULABLE] === 'false' ||
      this.spec.unschedulable
    );
  }

  get isMigratable() {
    const states = ['in-progress', 'unavailable'];

    return (
      !this.metadata?.annotations?.[HCI_ANNOTATIONS.MAINTENANCE_STATUS] &&
      !this.isUnSchedulable &&
      !states.includes(this.state)
    );
  }

  get isCordoned() {
    return (this.isUnSchedulable && !this.isEtcd) || this.hasAction('uncordon');
  }

  get isEtcd() {
    return this.metadata?.labels?.[HCI_ANNOTATIONS.NODE_ROLE_ETCD];
  }

  get isEnteringMaintenance() {
    return (
      this.metadata?.annotations?.[HCI_ANNOTATIONS.MAINTENANCE_STATUS] ===
      'running'
    );
  }

  get isMaintenance() {
    return (
      this.metadata?.annotations?.[HCI_ANNOTATIONS.MAINTENANCE_STATUS] ===
      'completed'
    );
  }

  get isCPUManagerEnabled() {
    return this.metadata?.labels?.[HCI_ANNOTATIONS.CPU_MANAGER] === 'true';
  }

  get isCPUManagerEnableInProgress() {
    return this.cpuManagerUpdateStatus === 'requested' || this.cpuManagerUpdateStatus === 'running';
  }

  get isCPUManagerEnableFailed() {
    return this.cpuManagerUpdateStatus === 'failed';
  }

  get cpuManagerUpdateStatus() {
    try {
      const cpuManagerUpdate = JSON.parse(this.metadata.annotations[HCI_ANNOTATIONS.NODE_CPU_MANAGER_UPDATE_STATUS] || '{}');

      return cpuManagerUpdate.status || '';
    } catch {
      return '';
    }
  }

  get longhornDisks() {
    const inStore = this.$rootGetters['currentProduct'].inStore;
    const longhornNode = this.$rootGetters[`${ inStore }/byId`](
      LONGHORN.NODES,
      `longhorn-system/${ this.id }`
    );
    const diskStatus = longhornNode?.status?.diskStatus || {};
    const diskSpec = longhornNode?.spec?.disks || {};

    const longhornDisks = Object.keys(diskStatus).map((key) => {
      const conditions = diskStatus[key]?.conditions || [];
      let readyCondition = {};
      let schedulableCondition = {};

      if (isArray(conditions)) {
        readyCondition = findBy(conditions, 'type', 'Ready') || {};
        schedulableCondition = findBy(conditions, 'type', 'Schedulable') || {};
      } else {
        readyCondition = conditions.Ready;
        schedulableCondition = conditions.Schedulable;
      }

      let state;

      if (readyCondition?.status !== 'True' || schedulableCondition?.status !== 'True') {
        state = WARNING;
      } else {
        state = HEALTHY;
      }

      return {
        ...diskSpec[key],
        ...diskStatus[key],
        name:             key,
        storageReserved:  diskSpec[key]?.storageReserved,
        storageAvailable: diskStatus[key]?.storageAvailable,
        storageMaximum:   diskStatus[key]?.storageMaximum,
        storageScheduled: diskStatus[key]?.storageScheduled,
        readyCondition,
        schedulableCondition,
        state,
      };
    });

    return longhornDisks;
  }

  get pods() {
    const inStore = this.$rootGetters['currentProduct'].inStore;
    const pods = this.$rootGetters[`${ inStore }/all`](POD) || [];

    return pods.filter(
      p => p?.spec?.nodeName === this.id && p?.metadata?.name !== 'removing'
    );
  }

  get reserved() {
    try {
      return JSON.parse(this.metadata.annotations[HCI_ANNOTATIONS.HOST_REQUEST] || '{}');
    } catch {
      return {};
    }
  }

  get cpuReserved() {
    return parseSi(this.reserved.cpu || '0');
  }

  get memoryReserved() {
    return parseSi(this.reserved.memory || '0');
  }

  get canDelete() {
    const nodes = this.$rootGetters['harvester/all'](NODE) || [];

    return nodes.length > 1;
  }

  get vlanStatuses() {
    const inStore = this.$rootGetters['currentProduct'].inStore;
    const nodeId = this.id;
    const vlanStatuses = this.$rootGetters[`${ inStore }/all`](HCI.VLAN_STATUS);

    return vlanStatuses.filter(s => s?.status?.node === nodeId) || [];
  }

  get blockDevices() {
    const inStore = this.$rootGetters['currentProduct'].inStore;
    const nodeId = this.id;
    const blockDevices = this.$rootGetters[`${ inStore }/all`](HCI.BLOCK_DEVICE);

    return blockDevices.filter(s => s?.spec?.nodeName === nodeId) || [];
  }

  get unProvisionedDisks() {
    const blockDevices = this.blockDevices || [];

    return blockDevices.filter(d => d?.isProvisioned && d?.status?.provisionPhase !== 'Provisioned');
  }

  get diskStatusCount() {
    const errorBlockDevices = this.unProvisionedDisks.filter(b => b.metadata.state.error) || [];

    let errorCount = 0;

    this.longhornDisks.map((d) => {
      if (d.state === 'warning') {
        errorCount++;
      }
    });

    const total = this.longhornDisks.length + errorBlockDevices.length;

    return {
      total,
      errorCount: errorCount + errorBlockDevices.length,
      useful:     total - errorCount,
    };
  }

  get manufacturer() {
    return this.metadata?.labels?.[HCI_ANNOTATIONS.NODE_MANUFACTURER];
  }

  get serialNumber() {
    return this.metadata?.labels?.[HCI_ANNOTATIONS.NODE_SERIAL_NUMBER];
  }

  get model() {
    return this.metadata?.labels?.[HCI_ANNOTATIONS.NODE_MODEL];
  }

  get isStopped() {
    const inventory = this.inventory || {};

    return inventory.spec?.powerActionRequested === 'shutdown' &&
            inventory.status?.powerAction?.actionStatus === 'complete';
  }

  get isStopping() {
    const inventory = this.inventory || {};

    if (!Object.prototype.hasOwnProperty.call(inventory?.status?.powerAction || {}, 'actionStatus')) {
      return inventory.spec?.powerActionRequested === 'shutdown';
    } else {
      return false;
    }
  }

  get isStarted() {
    const inventory = this.inventory || {};

    return inventory.spec?.powerActionRequested === 'poweron' &&
            inventory.status?.powerAction?.actionStatus === 'complete';
  }

  get isStarting() {
    const inventory = this.inventory || {};

    if (!Object.prototype.hasOwnProperty.call(inventory?.status?.powerAction || {}, 'actionStatus')) {
      return inventory.spec?.powerActionRequested === 'poweron';
    } else {
      return false;
    }
  }

  get isRebooting() {
    const inventory = this.inventory || {};

    if (!Object.prototype.hasOwnProperty.call(inventory?.status?.powerAction || {}, 'actionStatus')) {
      return inventory.spec?.powerActionRequested === 'reboot';
    } else {
      return false;
    }
  }

  async shutDown(resources = this) {
    try {
      await this.doAction('powerActionPossible', {});

      await this.doAction('powerAction', { operation: 'shutdown' });

      await this.$dispatch('growl/success', {
        title:   this.t('generic.notification.title.succeed'),
        message: this.t('harvester.host.powerAction.message.success', {
          name:      this.name,
          operation: 'shut down'
        })
      }, { root: true });
    } catch (err) {
      await this.$dispatch('growl/error', {
        title:   this.t('generic.notification.title.error'),
        message: err,
      }, { root: true });
    }
  }

  async powerOn(resources = this) {
    const operation = 'poweron';

    try {
      await this.doAction('powerActionPossible', {});

      await this.doAction('powerAction', { operation });

      await this.$dispatch('growl/success', {
        title:   this.t('generic.notification.title.succeed'),
        message: this.t('harvester.host.powerAction.message.success', {
          name: this.name,
          operation,
        })
      }, { root: true });
    } catch (err) {
      await this.$dispatch('growl/error', {
        title:   this.t('generic.notification.title.error'),
        message: err,
      }, { root: true });
    }
  }

  async reboot(resources = this) {
    const operation = 'reboot';

    try {
      await this.doAction('powerActionPossible', {});

      await this.doAction('powerAction', { operation });

      await this.$dispatch('growl/success', {
        title:   this.t('generic.notification.title.succeed'),
        message: this.t('harvester.host.powerAction.message.success', {
          name: this.name,
          operation,
        })
      }, { root: true });
    } catch (err) {
      await this.$dispatch('growl/error', {
        title:   this.t('generic.notification.title.error'),
        message: err,
      }, { root: true });
    }
  }

  get inventory() {
    const inStore = this.$rootGetters['currentProduct'].inStore;
    const inventories = this.$rootGetters[`${ inStore }/all`](HCI.INVENTORY) || [];

    return inventories.find(inv => inv.id === `harvester-system/${ this.id }`);
  }

  get warningMessages() {
    let out = [];

    out = out.concat(this.inventory?.warningMessages || []);

    return out;
  }
}
