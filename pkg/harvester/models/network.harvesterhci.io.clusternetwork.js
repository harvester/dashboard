import { HCI } from '../types';
import { clone } from '@shell/utils/object';
import HarvesterResource from './harvester';
import { NODE } from '@shell/config/types';

export default class HciClusterNetwork extends HarvesterResource {
  get doneOverride() {
    const detailLocation = clone(this.listLocation);

    detailLocation.params.resource = HCI.CLUSTER_NETWORK;

    return detailLocation;
  }

  get parentLocationOverride() {
    return {
      ...this.listLocation,
      params: {
        ...this.listLocation.params,
        resource: HCI.CLUSTER_NETWORK
      }
    };
  }

  get canDelete() {
    return this._canDelete && this.id !== 'mgmt';
  }

  get canUpdate() {
    return this.hasLink('update') && this.$rootGetters['type-map/optionsFor'](this.type).isEditable && this.id !== 'mgmt';
  }

  get isReady() {
    const readyCondition = (this?.status?.conditions || []).find(c => c.type === 'ready') || {};

    return readyCondition?.status === 'True';
  }

  get inStore() {
    return this.$rootGetters['currentProduct'].inStore;
  }

  get nodes() {
    const nodes = this.$rootGetters[`${ this.inStore }/all`](NODE);

    // filter out witness nodes and unschedulable nodes
    return nodes.filter(n => !n.isUnSchedulable && n.isEtcd !== 'true');
  }

  get vlanStatuses() {
    const vlanStatuses = this.$rootGetters[`${ this.inStore }/all`](HCI.VLAN_STATUS);
    const nodeIds = this.nodes.map(n => n.id);

    return vlanStatuses.filter((s) => {
      return nodeIds.includes(s?.status?.node) &&
              this.id === s?.status?.clusterNetwork;
    }) || [];
  }

  get isReadyForStorageNetwork() {
    if (this.id === 'mgmt') {
      return true;
    } else {
      const readyStatuses = this.vlanStatuses.filter(s => s.isReady) || [];

      return readyStatuses.length === this.nodes.length && this.isReady;
    }
  }
}
