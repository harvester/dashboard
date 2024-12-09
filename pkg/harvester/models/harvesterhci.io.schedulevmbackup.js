import HarvesterResource from './harvester';
import { get } from '@shell/utils/object';
import { findBy } from '@shell/utils/array';
import { colorForState, stateDisplay, STATES } from '@shell/plugins/dashboard-store/resource-class';
import { _CREATE } from '@shell/config/query-params';
import { ucFirst, escapeHtml } from '@shell/utils/string';

export default class ScheduleVmBackup extends HarvesterResource {
  detailPageHeaderActionOverride(realMode) {
    if (realMode === _CREATE) {
      return this.t('harvester.schedule.createTitle');
    }
  }

  get _availableActions() {
    const toFilter = ['goToClone'];

    const out = super._availableActions.filter((action) => {
      if (!toFilter.includes(action.action)) {
        return action;
      }
    });

    return [
      {
        action:  'resumeSchedule',
        enabled: ucFirst(this.state) === STATES.suspended.label,
        icon:    'icons icon-play',
        label:   this.t('harvester.action.resumeSchedule'),
      },
      {
        action:  'suspendSchedule',
        enabled: ucFirst(this.state) === STATES.active.label,
        icon:    'icons icon-pause',
        label:   this.t('harvester.action.suspendSchedule'),
      },
      ...out
    ];
  }

  async suspendSchedule() {
    try {
      this.spec.suspend = true; // suspend schedule
      await this.save();
    } catch (err) {
      this.spec.suspend = false;

      this.$dispatch('growl/fromError', {
        title: this.t('generic.notification.title.error', { name: escapeHtml(this.metadata.name) }),
        err,
      }, { root: true });
    }
  }

  async resumeSchedule() {
    try {
      this.spec.suspend = false; // resume schedule
      await this.save();
    } catch (err) {
      this.spec.suspend = true;

      this.$dispatch('growl/fromError', {
        title: this.t('generic.notification.title.error', { name: escapeHtml(this.metadata.name) }),
        err,
      }, { root: true });
    }
  }

  get state() {
    const conditions = get(this, 'status.conditions');
    const isSuspended = findBy(conditions, 'type', 'BackupSuspend')?.status === 'True';

    if (isSuspended) {
      return STATES.suspended.label;
    }

    return this.metadata.state.name;
  }

  get stateDescription() {
    const suspendedCondition = (this.status?.conditions || []).find(c => c.type === 'BackupSuspend');

    return ucFirst(suspendedCondition?.message) || super.stateDescription;
  }

  get stateBackground() {
    return colorForState(this.stateDisplay).replace('text-', 'bg-');
  }

  get stateColor() {
    return colorForState(this.state);
  }

  get stateDisplay() {
    return stateDisplay(this.state);
  }
}
