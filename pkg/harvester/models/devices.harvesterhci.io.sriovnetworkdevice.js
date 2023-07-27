import SteveModel from '@shell/plugins/steve/steve-class';
import { escapeHtml } from '@shell/utils/string';
import { colorForState } from '@shell/plugins/dashboard-store/resource-class';
import { NODE } from '@shell/config/types';

/**
 * Class representing SR-IOV Device resource.
 * @extends SteveModal
 */
export default class SRIOVDevice extends SteveModel {
  get _availableActions() {
    const out = super._availableActions;

    out.push(
      {
        action:  'enableDevice',
        enabled: !this.isEnabled,
        icon:    'icon icon-fw icon-dot',
        label:   'Enable',
      },
      {
        action:  'disableDevice',
        enabled: this.isEnabled,
        icon:    'icon icon-fw icon-dot-open',
        label:   'Disable',
      },
    );

    return out;
  }

  get canYaml() {
    return false;
  }

  get canDelete() {
    return false;
  }

  goToDetail() {
    return false;
  }

  goToEdit() {
    return false;
  }

  get actualState() {
    return this.isEnabled ? 'Enabled' : 'Disabled';
  }

  get stateDisplay() {
    return this.actualState;
  }

  get stateColor() {
    const state = this.actualState;

    return colorForState(state);
  }

  get isEnabled() {
    return this.status?.status === 'sriovNetworkDeviceEnabled' && this.spec?.numVFs > 0;
  }

  enableDevice(resources = this) {
    this.$dispatch('promptModal', {
      resources,
      component: 'EnableSriovDevice'
    });
  }

  async disableDevice() {
    const numVFsHistory = this.spec.numVFs;

    try {
      this.spec.numVFs = 0;
      await this.save();
    } catch (err) {
      this.spec.numVFs = numVFsHistory;
      this.$dispatch('growl/fromError', {
        title: this.t('generic.notification.title.error', { name: escapeHtml(this.metadata.name) }),
        err,
      }, { root: true });
    }
  }

  get realNodeName() {
    const inStore = this.$rootGetters['currentProduct'].inStore;
    const nodeName = this.spec?.nodeName;
    const nodes = this.$rootGetters[`${ inStore }/all`](NODE);
    const node = nodes.find(N => N.id === nodeName);

    return node?.nameDisplay || '';
  }
}
