import SteveModel from '@shell/plugins/steve/steve-class';

const HEALTHY = 'healthy';
const WARNING = 'warning';

export default class LonghornNode extends SteveModel {
  get used() {
    let out = 0;

    this.disks.filter(d => d.allowScheduling).map((disk) => {
      if (disk?.storageAvailable && disk?.storageMaximum) {
        out += disk.storageMaximum - disk.storageAvailable;
      }
    });

    return out;
  }

  get disks() {
    const diskStatus = this?.status?.diskStatus || {};
    const diskSpec = this?.spec?.disks || {};

    return Object.keys(diskSpec).map((key) => {
      const conditions = diskStatus[key]?.conditions || [];
      const readyCondition = conditions.find(c => c.type === 'Ready') || {};
      const schedulableCondition = conditions.find(c => c.type === 'Schedulable') || {};

      let state;

      if (readyCondition?.status !== 'True' || schedulableCondition?.status !== 'True') {
        state = WARNING;
      } else {
        state = HEALTHY;
      }

      return {
        ...diskStatus[key],
        ...diskSpec[key],
        id: key,
        state,
      };
    }) || [];
  }
}
