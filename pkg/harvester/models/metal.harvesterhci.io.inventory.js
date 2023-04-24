import HarvesterResource from './harvester';
import { set } from '@shell/utils/object';

export default class HciInventory extends HarvesterResource {
  applyDefaults() {
    const defaultSpec = {
      baseboardSpec: { connection: { authSecretRef: {} } },
      events:        {
        enabled:         true,
        pollingInterval: '1h',
      },
    };

    set(this, 'metadata.annotations', {});
    set(this, 'spec', this.spec || defaultSpec);
    set(this, 'spec.baseboardSpec', this.spec?.baseboardSpec || {});
    set(this, 'spec.baseboardSpec.connection', this.spec?.baseboardSpec?.connection || {});
    set(this, 'spec.baseboardSpec.connection.authSecretRef', this.spec?.baseboardSpec?.connection?.authSecretRef || {});
  }
}
