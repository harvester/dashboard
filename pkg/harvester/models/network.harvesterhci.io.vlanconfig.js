import { set, clone } from '@shell/utils/object';
import HarvesterResource from './harvester';
import { HCI } from '../types';
import { insertAt } from '@shell/utils/array';

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
}
