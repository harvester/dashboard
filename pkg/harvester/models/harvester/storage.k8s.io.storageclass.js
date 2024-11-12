import { clone } from '@shell/utils/object';
import { HCI } from '../../types';
import StorageClass from '@shell/models/storage.k8s.io.storageclass';
import { PRODUCT_NAME as HARVESTER_PRODUCT } from '../../config/harvester';
import { LONGHORN_DRIVER } from '@shell/models/persistentvolume';
import { DATA_ENGINE_V1, DATA_ENGINE_V2 } from '../../models/harvester/persistentvolumeclaim';

export const LVM_DRIVER = 'lvm.driver.harvesterhci.io';

export default class HciStorageClass extends StorageClass {
  get detailLocation() {
    const detailLocation = clone(this._detailLocation);

    detailLocation.params.resource = HCI.STORAGE;
    detailLocation.name = `${ HARVESTER_PRODUCT }-c-cluster-resource-id`;

    return detailLocation;
  }

  get doneOverride() {
    const detailLocation = clone(this._detailLocation);

    delete detailLocation.params.namespace;
    delete detailLocation.params.id;
    detailLocation.params.resource = HCI.STORAGE;
    detailLocation.name = `${ HARVESTER_PRODUCT }-c-cluster-resource`;

    return detailLocation;
  }

  get parentLocationOverride() {
    return this.doneOverride;
  }

  get parentNameOverride() {
    return this.$rootGetters['i18n/t'](`typeLabel."${ HCI.STORAGE }"`, { count: 1 })?.trim();
  }

  get longhornVersion() {
    if (this.provisioner === LONGHORN_DRIVER) {
      return (this.parameters || {}).dataEngine || DATA_ENGINE_V1;
    }

    return null;
  }

  get provisionerDisplay() {
    let key = '';

    if (this.provisioner === LONGHORN_DRIVER) {
      key = `harvester.storage.storageClass.longhorn.${ this.longhornVersion }.label`;
    }

    if (this.provisioner === LVM_DRIVER) {
      key = `harvester.storage.storageClass.lvm.label`;
    }

    return key ? this.$rootGetters['i18n/t'](key) : this.provisioner;
  }

  get isLonghornV2() {
    return this.provisioner === LONGHORN_DRIVER && this.longhornVersion === DATA_ENGINE_V2;
  }
}
