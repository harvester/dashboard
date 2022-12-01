import { PVC } from '@shell/config/types';
import { isValidMac } from '@pkg/utils/regular';
import { SOURCE_TYPE } from '@pkg/config/harvester-map';
import { parseVolumeClaimTemplates } from '@pkg/utils/vm.js';

const maxNameLength = 20;

export function vmNetworks(spec, getters, errors, validatorArgs) {
  const { domain: { devices: { interfaces } }, networks } = spec;

  const allNames = new Set(); // duplicate name do not count

  interfaces.map( (I, index) => {
    allNames.add(I.name);
    const N = networks.find( N => I.name === N.name);
    const prefix = (I.name || N.name) || `Network ${ index + 1 }`;

    // The maximum length of volume name is 20 characters.
    if (I.name.length > maxNameLength) {
      const key = getters['i18n/t']('harvester.fields.name');
      const message = getters['i18n/t']('harvester.validation.generic.maxLength', { key, max: maxNameLength });

      errors.push(getters['i18n/t']('harvester.validation.generic.tabError', { prefix, message }));
    }

    if (!I.name || !N.name) {
      const key = getters['i18n/t']('generic.name');
      const message = getters['i18n/t']('validation.required', { key });

      errors.push(getters['i18n/t']('harvester.validation.generic.tabError', { prefix, message }));
    }

    if (N.multus) {
      if (!N.multus.networkName) {
        const key = getters['i18n/t']('harvester.fields.network');
        const message = getters['i18n/t']('validation.required', { key });

        errors.push(getters['i18n/t']('harvester.validation.generic.tabError', { prefix, message }));
      }
    }

    if (I.macAddress && !isValidMac(I.macAddress) && !N.pod) {
      const message = getters['i18n/t']('harvester.validation.vm.network.macFormat');

      errors.push(getters['i18n/t']('harvester.validation.generic.tabError', { prefix, message }));
    }
  });

  if (allNames.size !== interfaces.length) {
    errors.push(getters['i18n/t']('harvester.validation.vm.network.duplicatedName'));
  }

  return errors;
}

export function vmDisks(spec, getters, errors, validatorArgs, displayKey, value) {
  const isVMTemplate = validatorArgs.includes('isVMTemplate');
  const data = isVMTemplate ? this.value.spec.vm : value;

  const _volumeClaimTemplates = parseVolumeClaimTemplates(data);

  const _volumes = spec.template.spec.volumes || [];
  const _disks = spec.template.spec.domain.devices.disks || [];

  const allNames = new Set(); // duplicate name do not count

  _disks.forEach((D, idx) => {
    const prefix = D.name || _volumes[idx]?.name || `Volume ${ idx + 1 }`;

    allNames.add(D.name);

    if (!D.disk && !D.cdrom) {
      const key = getters['i18n/t']('harvester.fields.type');
      const message = getters['i18n/t']('validation.required', { key });

      errors.push(getters['i18n/t']('harvester.validation.generic.tabError', { prefix, message }));
    }

    // The maximum length of volume name is 20 characters.
    if (D.name?.length > maxNameLength) {
      const key = getters['i18n/t']('harvester.fields.name');
      const message = getters['i18n/t']('harvester.validation.generic.maxLength', { key, max: maxNameLength });

      errors.push(getters['i18n/t']('harvester.validation.generic.tabError', { prefix, message }));
    }

    if (!D.name) {
      const key = getters['i18n/t']('generic.name');
      const message = getters['i18n/t']('validation.required', { key });

      errors.push(getters['i18n/t']('harvester.validation.generic.tabError', { prefix, message }));
    }
  });

  if (allNames.size !== _disks.length) {
    errors.push(getters['i18n/t']('harvester.validation.vm.volume.duplicatedName'));
  }

  let requiredVolume = false;

  _volumes.forEach((V, idx) => {
    const { type, typeValue } = getVolumeType(V, _volumeClaimTemplates);

    const prefix = V.name || idx + 1;

    if ([SOURCE_TYPE.IMAGE, SOURCE_TYPE.ATTACH_VOLUME, SOURCE_TYPE.CONTAINER].includes(type)) {
      requiredVolume = true;
    }

    if (type === SOURCE_TYPE.NEW || type === SOURCE_TYPE.IMAGE) {
      if (!/([1-9]|[1-9][0-9]+)[a-zA-Z]+/.test(typeValue?.spec?.resources?.requests?.storage)) {
        const key = getters['i18n/t']('harvester.fields.size');
        const message = getters['i18n/t']('validation.required', { key });

        errors.push(getters['i18n/t']('harvester.validation.generic.tabError', { prefix, message }));
      }

      if (typeValue?.spec?.resources?.requests?.storage && !/^([1-9][0-9]{0,8})[a-zA-Z]+$/.test(typeValue?.spec?.resources?.requests?.storage)) {
        const message = getters['i18n/t']('harvester.validation.generic.maximumSize', { max: '999999999 GiB' });

        errors.push(getters['i18n/t']('harvester.validation.generic.tabError', { prefix, message }));
      }

      if (type === SOURCE_TYPE.IMAGE && !typeValue?.spec?.storageClassName && !isVMTemplate) { // type === SOURCE_TYPE.IMAGE
        const key = getters['i18n/t']('harvester.fields.image');
        const message = getters['i18n/t']('validation.required', { key });

        errors.push(getters['i18n/t']('harvester.validation.generic.tabError', { prefix, message }));
      }

      if (type === SOURCE_TYPE.NEW && !typeValue?.spec?.storageClassName) {
        const key = getters['i18n/t']('harvester.fields.storageClass');
        const message = getters['i18n/t']('validation.required', { key });

        errors.push(getters['i18n/t']('harvester.validation.generic.tabError', { prefix, message }));
      }
    }

    if (type === SOURCE_TYPE.ATTACH_VOLUME) {
      const allPVCs = getters['harvester/all'](PVC);

      const selectedVolumeName = V?.persistentVolumeClaim?.claimName;
      const hasExistingVolume = allPVCs.find(P => P.metadata.name === selectedVolumeName);

      if (!hasExistingVolume && selectedVolumeName) { // selected volume may have been deleted. e.g: use template
        errors.push(getters['i18n/t']('harvester.validation.generic.hasDelete', { name: selectedVolumeName }));
      }

      if (!selectedVolumeName) { // volume is not selected.
        const key = getters['i18n/t']('harvester.virtualMachine.volume.volume');

        errors.push(getters['i18n/t']('validation.required', { key }));
      }
    }

    if (type === SOURCE_TYPE.CONTAINER && !V.containerDisk.image) {
      const key = getters['i18n/t']('harvester.fields.dockerImage');
      const message = getters['i18n/t']('validation.required', { key });

      errors.push(getters['i18n/t']('harvester.validation.generic.tabError', { prefix, message }));
    }
  });

  /**
   *  At least one volume must be create.  (Verify only when create.)
   */
  if ((!requiredVolume || _volumes.length === 0) && !value.links) {
    errors.push(getters['i18n/t']('harvester.validation.vm.volume.needImageOrExisting'));
  }

  return errors;
}

function getVolumeType(V, DVTS) {
  let outValue = null;

  if (V.persistentVolumeClaim) {
    outValue = DVTS.find((DVT) => {
      return V.persistentVolumeClaim.claimName === DVT.metadata.name && DVT.metadata?.annotations && Object.prototype.hasOwnProperty.call(DVT.metadata.annotations, 'harvesterhci.io/imageId');
    });

    if (outValue) {
      return {
        type:      SOURCE_TYPE.IMAGE,
        typeValue: outValue
      };
    }

    // new type
    outValue = DVTS.find(DVT => V.persistentVolumeClaim.claimName === DVT.metadata.name);

    if (outValue) {
      return {
        type:      SOURCE_TYPE.NEW,
        typeValue: outValue
      };
    }

    // existing, container type volume doesn't need validator
    return {
      type:      SOURCE_TYPE.ATTACH_VOLUME,
      typeValue: null
    };
  }

  if (V.containerDisk) {
    return {
      type:      SOURCE_TYPE.CONTAINER,
      typeValue: null
    };
  }

  return {};
}
