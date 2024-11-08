import Vue from 'vue';
import { _CLONE } from '@shell/config/query-params';
import pick from 'lodash/pick';
import { HCI, VOLUME_SNAPSHOT } from '../../types';
import { PV, LONGHORN, STORAGE_CLASS } from '@shell/config/types';
import { DESCRIPTION } from '@shell/config/labels-annotations';
import { HCI as HCI_ANNOTATIONS } from '@pkg/harvester/config/labels-annotations';
import { findBy } from '@shell/utils/array';
import { get, clone } from '@shell/utils/object';
import { colorForState } from '@shell/plugins/dashboard-store/resource-class';
import HarvesterResource from '../harvester';
import { PRODUCT_NAME as HARVESTER_PRODUCT } from '../../config/harvester';
import { LVM_DRIVER } from './storage.k8s.io.storageclass';
import { LONGHORN_DRIVER } from '@shell/models/persistentvolume';

const DEGRADED_ERRORS = ['replica scheduling failed', 'precheck new replica failed'];

export const DATA_ENGINE_V1 = 'v1';
export const DATA_ENGINE_V2 = 'v2';

export default class HciPv extends HarvesterResource {
  applyDefaults(_, realMode) {
    const accessModes = realMode === _CLONE ? this.spec.accessModes : [];
    const storage =
      realMode === _CLONE ? this.spec.resources.requests.storage : null;
    const storageClassName =
      realMode === _CLONE ? this.spec.storageClassName : '';

    Vue.set(this, 'spec', {
      accessModes,
      storageClassName,
      volumeName: '',
      resources:  { requests: { storage } }
    });
  }

  get availableActions() {
    let out = super._availableActions;

    // Longhorn V2 provisioner do not support volume clone feature yet
    if (this.isLonghornV2) {
      out = out.filter(action => action.action !== 'goToClone');
    } else {
      const clone = out.find(action => action.action === 'goToClone');

      if (clone) {
        clone.action = 'goToCloneVolume';
      }
    }

    if (!this.isLonghorn || !this.isLonghornV2) {
      out = [
        {
          action:  'exportImage',
          enabled: this.hasAction('export') && !this.isEncrypted,
          icon:    'icon icon-copy',
          label:   this.t('harvester.action.exportImage')
        },
        {
          action:  'snapshot',
          enabled: this.hasAction('snapshot'),
          icon:    'icon icon-backup',
          label:   this.t('harvester.action.snapshot'),
        },
        ...out
      ];
    }

    return [
      {
        action:  'cancelExpand',
        enabled: this.hasAction('cancelExpand'),
        icon:    'icon icon-backup',
        label:   this.t('harvester.action.cancelExpand')
      },
      ...out
    ];
  }

  exportImage(resources = this) {
    this.$dispatch('promptModal', {
      resources,
      component: 'HarvesterExportImageDialog'
    });
  }

  cancelExpand(resources = this) {
    this.doActionGrowl('cancelExpand', {});
  }

  snapshot(resources = this) {
    this.$dispatch('promptModal', {
      resources,
      component: 'SnapshotDialog'
    });
  }

  goToCloneVolume(resources = this) {
    this.$dispatch('promptModal', {
      resources,
      component: 'VolumeCloneDialog'
    });
  }

  cleanForNew() {
    this.$dispatch(`cleanForNew`, this);

    delete this.metadata.finalizers;
    const keys = [HCI_ANNOTATIONS.IMAGE_ID, DESCRIPTION];

    this.metadata.annotations = pick(this.metadata.annotations, keys);
  }

  get storageClass() {
    const inStore = this.$rootGetters['currentProduct'].inStore;

    return this.$rootGetters[`${ inStore }/all`](STORAGE_CLASS).find(sc => sc.name === this.spec.storageClassName);
  }

  get canUpdate() {
    return this.hasLink('update');
  }

  get stateDisplay() {
    const volumeError = this.relatedPV?.metadata?.annotations?.[HCI_ANNOTATIONS.VOLUME_ERROR];
    const degradedVolume = DEGRADED_ERRORS.includes(volumeError);
    const status = this?.status?.phase === 'Bound' && !volumeError && this.isLonghornVolumeReady ? 'Ready' : 'Not Ready';

    const conditions = this?.status?.conditions || [];

    if (findBy(conditions, 'type', 'Resizing')?.status === 'True') {
      return 'Resizing';
    } else if (!!this.attachVM && !volumeError) {
      return 'In-use';
    } else if (degradedVolume) {
      return 'Degraded';
    } else {
      return status;
    }
  }

  // state is similar with stateDisplay, the reason we keep this property is the status of In-use should not be displayed on vm detail page
  get state() {
    const volumeError = this.relatedPV?.metadata?.annotations?.[HCI_ANNOTATIONS.VOLUME_ERROR];
    const degradedVolume = DEGRADED_ERRORS.includes(volumeError);
    let status = this?.status?.phase === 'Bound' && !volumeError ? 'Ready' : 'Not Ready';

    const conditions = this?.status?.conditions || [];

    if (degradedVolume) {
      status = 'Degraded';
    }

    if (findBy(conditions, 'type', 'Resizing')?.status === 'True') {
      status = 'Resizing';
    }

    return status;
  }

  get stateColor() {
    const state = this.stateDisplay;

    return colorForState(state);
  }

  get stateDescription() {
    return (
      super.stateDescription
    );
  }

  get detailLocation() {
    const detailLocation = clone(this._detailLocation);

    detailLocation.params.resource = HCI.VOLUME;

    return detailLocation;
  }

  get doneOverride() {
    const detailLocation = clone(this._detailLocation);

    delete detailLocation.params.namespace;
    delete detailLocation.params.id;
    detailLocation.params.resource = HCI.VOLUME;
    detailLocation.name = `${ HARVESTER_PRODUCT }-c-cluster-resource`;

    return detailLocation;
  }

  get parentNameOverride() {
    return this.$rootGetters['i18n/t'](`typeLabel."${ HCI.VOLUME }"`, { count: 1 }).trim();
  }

  get parentLocationOverride() {
    return this.doneOverride;
  }

  get phaseState() {
    return this.status?.phase || 'N/A';
  }

  get attachVM() {
    const allVMs = this.$rootGetters['harvester/all'](HCI.VM) || [];

    const findAttachVM = (vm) => {
      const attachVolumes = vm.spec.template?.spec?.volumes || [];

      if (vm.namespace === this.namespace && attachVolumes.length > 0) {
        return attachVolumes.find(vol => vol.persistentVolumeClaim?.claimName === this.name);
      }

      return null;
    };

    return allVMs.find(findAttachVM);
  }

  get isAvailable() {
    const unAvailable = ['Resizing', 'Not Ready'];

    return !unAvailable.includes(this.stateDisplay);
  }

  get volumeSort() {
    const volume = this.spec?.resources?.requests?.storage || 0;

    return parseInt(volume);
  }

  get isSystemResource() {
    const systemNamespaces = this.$rootGetters['systemNamespaces'];

    if (systemNamespaces.includes(this.metadata?.namespace)) {
      return true;
    }

    return false;
  }

  get isEncrypted() {
    return this.relatedPV?.spec.csi.volumeAttributes.encrypted === 'true';
  }

  get longhornVolume() {
    const inStore = this.$rootGetters['currentProduct'].inStore;

    return this.$rootGetters[`${ inStore }/all`](LONGHORN.VOLUMES).find(v => v.metadata?.name === this.spec?.volumeName);
  }

  get longhornEngine() {
    const inStore = this.$rootGetters['currentProduct'].inStore;

    return this.$rootGetters[`${ inStore }/all`](LONGHORN.ENGINES).find(v => v.spec?.volumeName === this.spec?.volumeName);
  }

  // https://github.com/longhorn/longhorn-manager/blob/master/api/model.go#L1151
  get isLonghornVolumeReady() {
    let ready = true;
    const longhornVolume = this.longhornVolume || {};

    const scheduledCondition = (longhornVolume?.status?.conditions || []).find(c => c.type === 'Scheduled' || c.type === 'scheduled') || {};

    if ((longhornVolume?.spec?.nodeID === '' && longhornVolume?.status?.state !== 'detached') ||
          (longhornVolume?.status?.state === 'detached' && scheduledCondition.status !== 'True') ||
          longhornVolume?.status?.robustness === 'faulted' ||
          longhornVolume?.status?.restoreRequired ||
          longhornVolume?.status?.cloneStatus?.state === 'failed'
    ) {
      ready = false;
    }

    return ready;
  }

  get relatedVolumeSnapshotCounts() {
    const snapshots = this.$rootGetters['harvester/all'](VOLUME_SNAPSHOT);

    return snapshots.filter((snapshot) => {
      const volumeId = `${ snapshot.metadata?.namespace }/${ snapshot.spec?.source?.persistentVolumeClaimName }`;
      const kind = snapshot.metadata?.ownerReferences?.[0]?.kind;

      return volumeId === this.id && kind === 'PersistentVolumeClaim';
    });
  }

  get originalSnapshot() {
    if (this.spec?.dataSource) {
      return this.$rootGetters['harvester/all'](VOLUME_SNAPSHOT).find(V => V.metadata?.name === this.spec.dataSource.name);
    } else {
      return null;
    }
  }

  get source() {
    const imageId = get(this, `metadata.annotations."${ HCI_ANNOTATIONS.IMAGE_ID }"`);

    return imageId ? 'image' : 'data';
  }

  get warnDeletionMessage() {
    return this.t('harvester.volume.promptRemove.tips');
  }

  get relatedPV() {
    return this.$rootGetters['harvester/all'](PV).find(pv => pv.metadata?.name === this.spec?.volumeName);
  }

  get volumeProvider() {
    return this.relatedPV?.spec.csi?.driver;
  }

  get dataEngine() {
    return this.relatedPV?.spec.csi?.volumeAttributes?.dataEngine;
  }

  get isLvm() {
    return this.volumeProvider === LVM_DRIVER;
  }

  get isLonghorn() {
    return this.volumeProvider === LONGHORN_DRIVER;
  }

  get isLonghornV2() {
    return this.dataEngine === DATA_ENGINE_V2;
  }

  get resourceExternalLink() {
    const host = window.location.host;
    const { params } = this.currentRoute();
    const volumeName = this.spec?.volumeName;

    if (!volumeName) {
      return null;
    }

    return {
      tipsKey: 'harvester.volume.externalLink.tips',
      url:     `https://${ host }/k8s/clusters/${ params.cluster }/api/v1/namespaces/longhorn-system/services/http:longhorn-frontend:80/proxy/#/volume/${ volumeName }`
    };
  }

  get customValidationRules() {
    return [
      {
        nullable:   false,
        path:       'spec.resources.requests.storage',
        required:   true,
        validators: ['volumeSize']
      },
    ];
  }
}
