import HarvesterResource from './harvester';
import { set } from '@shell/utils/object';

export default class HciInventory extends HarvesterResource {
  applyDefaults() {
    const defaultSpec = {
      baseboardSpec: {
        connection: {
          authSecretRef: {},
          insecureTLS:   false,
        }
      },
      events: {
        enabled:         true,
        pollingInterval: '1h',
      },
      primaryDisk:                   '',
      managementInterfaceMacAddress: '',
    };

    set(this, 'metadata.annotations', {});
    set(this, 'spec', this.spec || defaultSpec);
    set(this, 'spec.baseboardSpec', this.spec?.baseboardSpec || defaultSpec.baseboardSpec);
    set(this, 'spec.baseboardSpec.connection', this.spec?.baseboardSpec?.connection || defaultSpec.baseboardSpec.connection);
    set(this, 'spec.baseboardSpec.connection.authSecretRef', this.spec?.baseboardSpec?.connection?.authSecretRef || {});
  }

  get warningMessages() {
    const out = [];

    if (this.metadata?.state?.error) {
      out.push({ text: this.metadata?.state.message });
    }

    return out;
  }

  get customValidationRules() {
    return [
      {
        path:           'spec.events.pollingInterval',
        translationKey: 'harvester.seeder.inventory.pollingInterval.label',
        validators:     ['interval'],
      },
    ];
  }
}
