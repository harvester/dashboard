import { insertAt } from '@shell/utils/array';
import namespace from '@shell/models/namespace';
import { SYSTEM_NAMESPACE, FLEET } from '@shell/config/labels-annotations';
import SYSTEM_NAMESPACES from '@shell/config/system-namespaces';
import { get } from '@shell/utils/object';
import { NAMESPACE } from '@shell/config/types';
import { PRODUCT_NAME as HARVESTER_PRODUCT } from '@pkg/harvester/config/harvester';

const OBSCURE_NAMESPACE_PREFIX = [
  'c-', // cluster namespace

  // Project namespace. When a user creates a project, Rancher creates
  // namespaces in the local cluster with the 'p-' prefix which are
  // used to manage RBAC for the project. If these namespaces are deleted,
  // role bindings can be lost and Rancher may need to be restored from
  // backup. Therefore we hide these namespaces unless the developer setting
  // is turned on from the user preferences.
  'p-',

  'user-', // user namespace
  'local', // local namespace
];

export default class HciNamespace extends namespace {
  get _availableActions() {
    const out = super._availableActions;
    const remove = out.findIndex(a => a.action === 'promptRemove');

    const promptRemove = {
      action:     'promptRemove',
      altAction:  'remove',
      label:      this.t('action.remove'),
      icon:       'icon icon-trash',
      bulkable:   true,
      enabled:    this.canDelete,
      bulkAction: 'promptRemove',
      weight:     -10,
    };

    if (remove > -1) {
      out.splice(remove, 1);
    }

    insertAt(out, out.length - 1, promptRemove);

    return out;
  }

  promptRemove(resources = this) {
    this.$dispatch('promptModal', {
      resources,
      warningMessageKey: 'promptRemove.confirmRelatedResource',
      component:         'ConfirmRelatedToRemoveDialog'
    });
  }

  get isSystem() {
    const systemNamespaces = ['fleet-default'];

    if (systemNamespaces.includes(this.metadata.name)) {
      return true;
    }

    if ( this.metadata?.annotations?.[SYSTEM_NAMESPACE] === 'true' ) {
      return true;
    }

    if ( SYSTEM_NAMESPACES.includes(this.metadata.name) ) {
      return true;
    }

    if ( this.metadata.name.endsWith('-system') ) {
      return true;
    }

    if ( this.project ) {
      return this.project.isSystem;
    }

    if (get(this, `metadata.labels."${ FLEET.MANAGED }"`) === 'true') {
      return true;
    }

    const isSettingSystemNamespace = this.$rootGetters['systemNamespaces'].includes(this.metadata.name);
    const isObscurePrefix = !!OBSCURE_NAMESPACE_PREFIX.some(prefix => this.metadata.name.startsWith(prefix));

    return isSettingSystemNamespace || isObscurePrefix;
  }

  get detailLocation() {
    const id = this.id?.replace(/.*\//, '');

    const detailLocation = {
      name:   `${ HARVESTER_PRODUCT }-c-cluster-resource-id`,
      params: {
        product:   this.$rootGetters['productId'],
        cluster:   this.$rootGetters['clusterId'],
        resource:  NAMESPACE,
        namespace: this.metadata?.namespace,
        id,
      }
    };

    return detailLocation;
  }

  get hideDetailLocation() {
    return !!this.$rootGetters['currentProduct'].hideNamespaceLocation;
  }
}
