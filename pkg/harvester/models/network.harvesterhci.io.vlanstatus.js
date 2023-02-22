import { findBy } from '@shell/utils/array';

import HarvesterResource from './harvester';

export default class HciVlanStatus extends HarvesterResource {
  get isReady() {
    const conditions = this.status?.conditions || [];
    const readyCondition = findBy(conditions, 'type', 'ready') || {};

    return readyCondition.status === 'True';
  }
}
