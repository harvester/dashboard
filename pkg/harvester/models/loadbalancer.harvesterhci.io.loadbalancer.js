import { set, clone } from '@shell/utils/object';
import HarvesterResource from '@pkg/harvester/models/harvester';
import { HCI } from '@pkg/harvester/types';

const WORKLOAD_TYPE_VM = 'vm';
const NOT_READY = 'Not Ready';

export default class HciLB extends HarvesterResource {
  applyDefaults() {
    const spec = this.spec || {};
    const meta = this.metadata || {};

    spec.workloadType = spec.workloadType || WORKLOAD_TYPE_VM;
    spec.ipam = spec.ipam || 'dhcp';
    spec.healthCheck = spec.healthCheck || {};
    spec.backendServerSelector = spec.backendServerSelector || {};

    set(this, 'spec', spec);
    set(this, 'metadata', meta);
  }

  get workloadTypeDisplay() {
    const workloadType = this.spec?.workloadType || 'cluster';

    return this.$rootGetters['i18n/t'](`harvester.loadBalancer.workloadType.options.${ workloadType }`);
  }

  get ipamDisplay() {
    const ipam = this.spec?.ipam;

    return this.$rootGetters['i18n/t'](`harvester.loadBalancer.ipam.options.${ ipam }`);
  }

  get customValidationRules() {
    return [
      {
        nullable:       false,
        path:           'metadata.name',
        required:       true,
        translationKey: 'generic.name',
        type:           'dnsLabel',
      },
    ];
  }

  get canCustomEdit() {
    return this.$rootGetters['type-map/hasCustomEdit'](this.type, this.id) && this.spec.workloadType === WORKLOAD_TYPE_VM;
  }

  get canUpdate() {
    return this.hasLink('update') && this.$rootGetters['type-map/optionsFor'](this.type).isEditable && this.spec.workloadType === WORKLOAD_TYPE_VM;
  }

  get canClone() {
    return this.spec.workloadType === WORKLOAD_TYPE_VM;
  }

  get details() {
    const out = [{
      label:   this.t('harvester.loadBalancer.ipam.label'),
      content: this.ipamDisplay,
    }, {
      label:   this.t('harvester.loadBalancer.workloadType.label'),
      content: this.workloadTypeDisplay,
    }, {
      label:   this.t('tableHeaders.address'),
      content: this.status.address,
    }];

    return out;
  }

  get doneOverride() {
    const detailLocation = clone(this.listLocation);

    detailLocation.params.resource = HCI.LB;

    return detailLocation;
  }

  get parentLocationOverride() {
    return {
      ...this.listLocation,
      params: {
        ...this.listLocation.params,
        resource: HCI.LB,
      }
    };
  }

  get isReady() {
    const readyCondition = (this?.status?.conditions || []).find(c => c.type === 'Ready') || {};

    return readyCondition?.status === 'True';
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
