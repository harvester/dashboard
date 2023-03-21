import SteveModel from '@shell/plugins/steve/steve-class';
import { colorForState } from '@shell/plugins/dashboard-store/resource-class';
import { NODE } from '@shell/config/types';
import { HCI } from '../types';

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
    this.spec.numVFs = 0;
    await this.save();
  }

  get realNodeName() {
    const device = this.$getters['byId'](HCI.SR_IOV, this.id);
    const nodeName = device?.spec?.nodeName;
    const node = this.$getters['byId'](NODE, nodeName);

    return node?.nameDisplay || '';
  }
}
