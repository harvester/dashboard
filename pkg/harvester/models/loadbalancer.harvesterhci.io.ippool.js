import Vue from 'vue';
import { clone } from '@shell/utils/object';
import HarvesterResource from '@pkg/harvester/models/harvester';
import { HCI } from '@pkg/harvester/types';

const NOT_READY = 'Not Ready';

export default class HciLB extends HarvesterResource {
  applyDefaults() {
    const spec = this.spec || {};
    const meta = this.metadata || {};

    spec.ranges = spec.ranges || [];
    spec.selector = spec.selector || {};
    spec.selector.network = spec.selector.network || '';

    Vue.set(this, 'spec', spec);
    Vue.set(this, 'metadata', meta);
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
      {
        nullable:   false,
        path:       'spec.ranges',
        type:       'array',
        validators: ['ranges'],
      }
    ];
  }

  get subnetDisplay() {
    const ranges = this.spec?.ranges || [];

    return ranges.map(r => r.subnet).join(', ');
  }

  get startIPDisplay() {
    const ranges = this.spec?.ranges || [];

    return ranges.filter(r => r.startIP).map(r => r.startIP).join(', ');
  }

  get endIPDisplay() {
    const ranges = this.spec?.ranges || [];

    return ranges.filter(r => r.endIP).map(r => r.endIP).join(', ');
  }

  get details() {
    const out = [{
      label:   this.t('harvester.ipPool.availableIP.label'),
      content: this.status?.available,
    }];

    return out;
  }

  get doneOverride() {
    const detailLocation = clone(this.listLocation);

    detailLocation.params.resource = HCI.IP_POOL;

    return detailLocation;
  }

  get parentLocationOverride() {
    return {
      ...this.listLocation,
      params: {
        ...this.listLocation.params,
        resource: HCI.IP_POOL,
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
