import HarvesterResource from './harvester';
import { HCI as HCI_ANNOTATIONS } from '../config/labels-annotations';
import jsyaml from 'js-yaml';
export default class HciAddonConfig extends HarvesterResource {
  get availableActions() {
    const out = super._availableActions;

    if (this.id === 'harvester-system/rancher-vcluster') {
      const rancherDashboard = {
        action:  'goToRancher',
        enabled: this.spec.enabled,
        icon:    'icon icon-external-link',
        label:   this.t('harvester.addons.rancherVcluster.accessRancher'),
      };

      out.push(rancherDashboard);
    }

    const toggleAddon = {
      action:  'toggleAddon',
      enabled: true,
      icon:    this.spec.enabled ? 'icon icon-pause' : 'icon icon-play',
      label:   this.spec.enabled ? this.t('generic.disable') : this.t('generic.enable'),
    };

    out.unshift(toggleAddon);

    return out;
  }

  toggleAddon() {
    this.spec.enabled = !this.spec.enabled;
    this.save();
  }

  goToRancher() {
    const valuesContent = jsyaml.load(this.spec.valuesContent);

    window.open(
      `https://${ valuesContent.hostname }`,
      '_blank',
    );
  }

  get rancherHostname() {
    const valuesContent = jsyaml.load(this.spec.valuesContent);

    return `https://${ valuesContent.hostname }`;
  }

  get stateColor() {
    const state = this.stateDisplay;

    if (state?.toLowerCase().includes('enabled') || state?.toLowerCase().includes('success')) {
      return 'text-success';
    } else if (state === 'Disabled') {
      return 'text-darker';
    } else if (state === 'Processing') {
      return 'text-info';
    } else if (state?.toLowerCase().includes('failed') || state?.toLowerCase().includes('error')) {
      return 'text-error';
    } else {
      return 'text-info';
    }
  }

  get stateDisplay() {
    if (!this?.status?.status) {
      return this.spec.enabled === false ? 'Disabled' : 'Processing';
    }

    const out = this?.status?.status;

    if (out.startsWith('Addon')) {
      return out.replace('Addon', '');
    }

    return out;
  }

  get displayName() {
    const isExperimental = this.metadata?.labels?.[HCI_ANNOTATIONS.ADDON_EXPERIMENTAL] === 'true';

    return isExperimental ? `${ this.metadata.name } (${ this.t('generic.experimental') })` : this.metadata.name;
  }

  get customValidationRules() {
    let rules = [];

    if (this.metadata.name === 'rancher-monitoring') {
      rules = [
        {
          nullable:   false,
          path:       'spec.valuesContent',
          validators: ['rancherMonitoring'],
        },
      ];
    }

    if (this.metadata.name === 'rancher-logging') {
      rules = [
        {
          nullable:   false,
          path:       'spec.valuesContent',
          validators: ['rancherLogging'],
        },
      ];
    }

    return rules;
  }
}
