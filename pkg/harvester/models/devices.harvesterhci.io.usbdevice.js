import SteveModel from '@shell/plugins/steve/steve-class';
import { escapeHtml } from '@shell/utils/string';
import { HCI } from '../types';

const STATUS_DISPLAY = {
  enabled: {
    displayKey: 'generic.enabled',
    color:      'bg-success'
  },
  pending: {
    displayKey: 'generic.inProgress',
    color:      'bg-info'
  },
  disabled: {
    displayKey: 'generic.disabled',
    color:      'bg-warning'
  },
  error: {
    displayKey: 'generic.disabled',
    color:      'bg-warning'
  }
};

/**
 * Class representing USB Device resource.
 * @extends SteveModal
 */
export default class USBDevice extends SteveModel {
  get _availableActions() {
    const out = super._availableActions;

    out.push(
      {
        action:     'enablePassthroughBulk',
        enabled:    !this.passthroughClaim && !this.status.enabled,
        icon:       'icon icon-fw icon-dot',
        label:      'Enable Passthrough',
        bulkable:   true,
        bulkAction: 'enablePassthroughBulk',
        weight:     1
      },
      {
        action:   'disablePassthrough',
        enabled:  this.status.enabled,
        icon:     'icon icon-fw icon-dot-open',
        label:    'Disable Passthrough',
        bulkable: true,
        weight:   0
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

  get passthroughClaim() {
    const passthroughClaims = this.$getters['all'](HCI.USB_CLAIM) || [];

    return !!this.status && passthroughClaims.find(req => req?.status?.nodeName === this.status?.nodeName && req?.metadata?.name === this.metadata?.name);
  }

  // this is an id for each 'type' of device - there may be multiple instances of device CRs
  get uniqueId() {
    return `${ this.status?.vendorId }:${ this.status?.deviceId }`;
  }

  get claimedBy() {
    return this.passthroughClaim?.spec?.userName;
  }

  get claimedByMe() {
    if (!this.passthroughClaim) {
      return false;
    }
    const isSingleProduct = this.$rootGetters['isSingleProduct'];
    let userName = 'admin';

    // if this is imported Harvester, there may be users other than admin
    if (!isSingleProduct) {
      const user = this.$rootGetters['auth/v3User'];

      userName = user?.username || user?.id;
    }

    return this.claimedBy === userName;
  }

  // map status.passthroughEnabled to disabled/enabled & overwrite default dash colors
  get claimStatusDisplay() {
    if (!this.passthroughClaim) {
      return STATUS_DISPLAY.disabled;
    }
    if (this.status.enabled) {
      return STATUS_DISPLAY.enabled;
    }

    return STATUS_DISPLAY.pending;
  }

  get stateDisplay() {
    const t = this.$rootGetters['i18n/t'];

    return t(this.claimStatusDisplay.displayKey);
  }

  get stateBackground() {
    return this.claimStatusDisplay.color;
  }

  // 'enable' passthrough creates the passthrough claim CRD -
  enablePassthroughBulk(resources = this) {
    this.$dispatch('promptModal', {
      resources,
      component: 'EnableUSBPassthrough'
    });
  }

  // 'disable' passthrough deletes claim
  // backend should return error if device is in use
  async disablePassthrough() {
    try {
      if (!this.claimedByMe) {
        throw new Error(this.$rootGetters['i18n/t']('harvester.usb.cantUnclaim', { name: escapeHtml(this.metadata.name) }));
      } else {
        await this.passthroughClaim.remove();
      }
    } catch (err) {
      this.$dispatch('growl/fromError', {
        title: this.$rootGetters['i18n/t']('harvester.usb.unclaimError', { name: escapeHtml(this.metadata.name) }),
        err,
      }, { root: true });
    }
  }

  // group device list by node
  get groupByNode() {
    const name = this.status?.nodeName || this.$rootGetters['i18n/t']('generic.none');

    return this.$rootGetters['i18n/t']('resourceTable.groupLabel.node', { name: escapeHtml(name) });
  }

  // group device list by unique device (same vendorid and deviceid)
  get groupByDevice() {
    return this.status?.description;
  }
}
