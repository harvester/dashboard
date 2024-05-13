import { PVC } from '@shell/config/types';
import { isValidMac, isValidDNSLabelName } from '@pkg/utils/regular';
import { SOURCE_TYPE } from '@pkg/config/harvester-map';
import { parseVolumeClaimTemplates } from '@pkg/utils/vm';

const maxNameLength = 63;

export function vmNetworks(spec, getters, errors, validatorArgs) {
  const { domain: { devices: { interfaces } }, networks } = spec;

  const networkNames = [];

  interfaces.map( (I, index) => {
    const N = networks.find( N => I.name === N.name);
    const prefix = (I.name || N.name) || `Network ${ index + 1 }`;

    const type = getters['i18n/t']('harvester.fields.network');

    const lowerType = getters['i18n/t']('harvester.validation.vm.network.lowerType');
    const upperType = getters['i18n/t']('harvester.validation.vm.network.upperType');

    validName(getters, errors, I.name, networkNames, prefix, type, lowerType, upperType);

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

  return errors;
}

export function vmDisks(spec, getters, errors, validatorArgs, displayKey, value) {
  const isVMTemplate = validatorArgs.includes('isVMTemplate');
  const data = isVMTemplate ? this.value.spec.vm : value;

  const _volumeClaimTemplates = parseVolumeClaimTemplates(data);

  const _volumes = spec.template.spec.volumes || [];
  const _disks = spec.template.spec.domain.devices.disks || [];

  const diskNames = [];

  _disks.forEach((D, idx) => {
    const prefix = D.name || _volumes[idx]?.name || `Volume ${ idx + 1 }`;

    if (!D.disk && !D.cdrom) {
      const key = getters['i18n/t']('harvester.fields.type');
      const message = getters['i18n/t']('validation.required', { key });

      errors.push(getters['i18n/t']('harvester.validation.generic.tabError', { prefix, message }));
    }

    const type = getters['i18n/t']('harvester.fields.volume');
    const lowerType = getters['i18n/t']('harvester.validation.vm.volume.lowerType');
    const upperType = getters['i18n/t']('harvester.validation.vm.volume.upperType');

    validName(getters, errors, D.name, diskNames, prefix, type, lowerType, upperType);
  });

  let requiredVolume = false;

  _volumes.forEach((V, idx) => {
    const { type, typeValue } = getVolumeType(getters, V, _volumeClaimTemplates, value);

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

      if (typeValue?.spec?.resources?.requests?.storage && !/^([0-9][0-9]{0,8})[a-zA-Z]+$/.test(typeValue?.spec?.resources?.requests?.storage)) {
        const message = getters['i18n/t']('harvester.validation.generic.maximumSize', { max: '999999999 GiB' });

        errors.push(getters['i18n/t']('harvester.validation.generic.tabError', { prefix, message }));
      }

      if (type === SOURCE_TYPE.IMAGE && !typeValue?.spec?.storageClassName && !isVMTemplate) { // type === SOURCE_TYPE.IMAGE
        const key = getters['i18n/t']('harvester.fields.image');
        const message = getters['i18n/t']('validation.required', { key });

        errors.push(getters['i18n/t']('harvester.validation.generic.tabError', { prefix, message }));
      }

      if (!typeValue?.spec?.storageClassName && V?.persistentVolumeClaim?.claimName && type !== SOURCE_TYPE.IMAGE) {
        const key = getters['i18n/t']('harvester.fields.storageClass');
        const message = getters['i18n/t']('validation.required', { key });

        errors.push(getters['i18n/t']('harvester.validation.generic.tabError', { prefix, message }));
      }
    }

    if (type === SOURCE_TYPE.ATTACH_VOLUME) {
      const allPVCs = getters['harvester/all'](PVC);

      const selectedVolumeName = V?.persistentVolumeClaim?.claimName;
      const hasExistingVolume = allPVCs.find(P => P.id === `${ value.metadata.namespace }/${ selectedVolumeName }`);

      if (!hasExistingVolume && selectedVolumeName) { // selected volume may have been deleted. e.g: use template
        const type = getters['i18n/t']('harvester.fields.volume');

        errors.push(getters['i18n/t']('harvester.validation.generic.hasDelete', { type, name: selectedVolumeName }));
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

function getVolumeType(getters, V, DVTS, value) {
  let outValue = null;
  const allPVCs = getters['harvester/all'](PVC);

  if (V.persistentVolumeClaim) {
    const selectedVolumeName = V?.persistentVolumeClaim?.claimName;
    const hasExistingVolume = allPVCs.find(P => P.id === `${ value.metadata.namespace }/${ selectedVolumeName }`);

    if (hasExistingVolume) {
      // In other cases, claimName will not be empty, so we can judge whether this is an exiting volume based on this attribute
      return {
        type:      SOURCE_TYPE.ATTACH_VOLUME,
        typeValue: null
      };
    }

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
  }

  if (V.containerDisk) {
    return {
      type:      SOURCE_TYPE.CONTAINER,
      typeValue: null
    };
  }

  return {};
}

function validName(getters, errors, name, names = [], prefix, type, lowerType, upperType) {
  // Verify that the name is duplicate
  if (names.findIndex( N => name === N) !== -1) {
    errors.push(getters['i18n/t']('harvester.validation.vm.duplicatedName', { type, name }));
  }

  names.push(name);

  // The maximum length of volume name is 63 characters.
  if (name && name?.length > maxNameLength) {
    const key = getters['i18n/t']('harvester.fields.name');
    const message = getters['i18n/t']('harvester.validation.generic.maxLength', { key, max: maxNameLength });

    errors.push(getters['i18n/t']('harvester.validation.generic.tabError', { prefix, message }));
  }

  // name required
  if (!name) {
    const key = getters['i18n/t']('harvester.fields.name');
    const message = getters['i18n/t']('validation.required', { key });

    errors.push(getters['i18n/t']('harvester.validation.generic.tabError', { prefix, message }));
  }

  // valid RFC 1123
  if (!isValidDNSLabelName(name)) {
    const regex = '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$';

    errors.push(getters['i18n/t']('harvester.validation.generic.regex', {
      lowerType, name, regex, upperType
    }));
  }
}
