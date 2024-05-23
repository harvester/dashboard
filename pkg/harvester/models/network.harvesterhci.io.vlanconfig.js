import { isEmpty } from 'lodash';

import { set, clone } from '@shell/utils/object';
import HarvesterResource from './harvester';
import { HCI } from '../types';
import { insertAt } from '@shell/utils/array';
import { HOSTNAME } from '@shell/config/labels-annotations';
import { matching } from '@shell/utils/selector';
import { NODE } from '@shell/config/types';

const NOT_READY = 'Not Ready';

export default class HciVlanConfig extends HarvesterResource {
  applyDefaults() {
    const defaultSpec = {
      uplink: {
        nics:           [],
        linkAttributes: {},
        bondOptions:    { mode: 'active-backup' },
      },
    };

    set(this, 'spec', this.spec || defaultSpec);
    set(this, 'spec.uplink.linkAttributes', this.spec?.uplink?.linkAttributes || {});
    set(this, 'spec.uplink.bondOptions', this.spec?.uplink?.bondOptions || {});
  }

  get groupByClusterNetwork() {
    return this.spec?.clusterNetwork;
  }

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

  get typeDisplay() {
    return 'VLAN';
  }

  get _availableActions() {
    const out = super._availableActions;

    insertAt(out, 0, this.migrateAction);

    return out;
  }

  get migrateAction() {
    return {
      action: 'migrate',
      icon:   'icon icon-copy',
      label:  this.t('harvester.vlanConfig.action.migrate'),
    };
  }

  migrate(resources = this) {
    this.$dispatch('promptModal', {
      resources,
      component: 'HarvesterVlanConfigMigrateDialog',
    });
  }

  get inStore() {
    return this.$rootGetters['currentProduct'].inStore;
  }

  get vlanStatuses() {
    const nodes = this.nodes.map(n => n.id) || [];
    const vlanStatuses = this.$rootGetters[`${ this.inStore }/all`](HCI.VLAN_STATUS);

    return vlanStatuses.filter((s) => {
      return nodes.includes(s?.status?.node) &&
              this.id === s?.status?.vlanConfig;
    }) || [];
  }

  get isReady() {
    if (this.nodes.length === 0 || (this.vlanStatuses.length !== this.nodes.length)) {
      return false;
    } else {
      const states = this.vlanStatuses.filter((s) => {
        return s.isReady;
      });

      return states.length === this.vlanStatuses.length;
    }
  }

  get selectedNodes() {
    const nodeSelector = this.spec?.nodeSelector || {};
    const nodes = this.$rootGetters[`${ this.inStore }/all`](NODE);

    if (isEmpty(nodeSelector)) {
      return nodes;
    } else if (nodeSelector[HOSTNAME] && Object.keys(nodeSelector).length === 1) {
      return nodes.filter(n => n.id === nodeSelector[HOSTNAME]) || [];
    } else {
      const matchNodes = matching(nodes || [], nodeSelector).map(n => n.id);

      return nodes.filter(n => matchNodes.includes(n.id));
    }
  }

  get nodes() {
    return this.selectedNodes.filter(n => !n.isUnSchedulable && n.isEtcd !== 'true');
  }

  get stateDisplay() {
    if (!this.isReady) {
      return NOT_READY;
    }

    return super.stateDisplay;
  }

  get stateBackground() {
    if (!this.isReady) {
      return 'bg-warning';
    }

    return super.stateBackground;
  }
}
