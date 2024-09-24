import Vue from 'vue';
import { HCI } from '../types';
import {
  DESCRIPTION,
  ANNOTATIONS_TO_IGNORE_REGEX,
} from '@shell/config/labels-annotations';
import { HCI as HCI_ANNOTATIONS } from '@pkg/harvester/config/labels-annotations';
import { get, clone } from '@shell/utils/object';
import { formatSi } from '@shell/utils/units';
import { ucFirst } from '@shell/utils/string';
import { stateDisplay, colorForState } from '@shell/plugins/dashboard-store/resource-class';
import { _CLONE } from '@shell/config/query-params';
import HarvesterResource from './harvester';
import { PRODUCT_NAME as HARVESTER_PRODUCT } from '../config/harvester';
import { CSI_SECRETS } from '@pkg/harvester/config/harvester-map';

const {
  CSI_PROVISIONER_SECRET_NAME,
  CSI_PROVISIONER_SECRET_NAMESPACE,
} = CSI_SECRETS;

function isReady() {
  function getStatusConditionOfType(type, defaultValue = []) {
    const conditions = Array.isArray(get(this, 'status.conditions')) ? this.status.conditions : defaultValue;

    return conditions.find( cond => cond.type === type);
  }

  const initialized = getStatusConditionOfType.call(this, 'Initialized');
  const imported = getStatusConditionOfType.call(this, 'Imported');
  const isCompleted = this.status?.progress === 100;

  if ([initialized?.status, imported?.status].includes('False')) {
    return false;
  } else {
    return isCompleted && true;
  }
}
export default class HciVmImage extends HarvesterResource {
  get availableActions() {
    let out = super._availableActions;
    const toFilter = ['goToEditYaml'];

    out = out.filter( A => !toFilter.includes(A.action));

    const schema = this.$getters['schemaFor'](HCI.VM);
    let canCreateVM = true;

    if ( schema && !schema?.collectionMethods.find(x => ['post'].includes(x.toLowerCase())) ) {
      canCreateVM = false;
    }

    return [
      {
        action:   'createFromImage',
        enabled:  canCreateVM,
        icon:     'icon icon-circle-plus',
        label:    this.t('harvester.action.createVM'),
        disabled: !this.isReady,
      },
      {
        action:   'encryptImage',
        enabled:  !this.isEncrypted,
        icon:     'icon icon-lock',
        label:    this.t('harvester.action.encryptImage'),
        disabled: !this.isReady,
      },
      {
        action:   'decryptImage',
        enabled:  this.isEncrypted,
        icon:     'icon icon-unlock',
        label:    this.t('harvester.action.decryptImage'),
        disabled: !this.isReady,
      },
      {
        action:  'download',
        enabled: this.links?.download,
        icon:    'icon icon-download',
        label:   this.t('asyncButton.download.action'),
      },
      ...out
    ];
  }

  encryptImage() {
    const router = this.currentRouter();

    router.push({
      name:   `${ HARVESTER_PRODUCT }-c-cluster-resource-create`,
      params: { resource: HCI.IMAGE },
      query:  {
        image:           this,
        fromPage:        HCI.IMAGE,
        sourceType:      'clone',
        cryptoOperation: 'encrypt'
      }
    });
  }

  decryptImage() {
    const router = this.currentRouter();

    router.push({
      name:   `${ HARVESTER_PRODUCT }-c-cluster-resource-create`,
      params: { resource: HCI.IMAGE },
      query:  {
        image:           this,
        fromPage:        HCI.IMAGE,
        sourceType:      'clone',
        cryptoOperation: 'decrypt'
      }
    });
  }

  applyDefaults(resources = this, realMode) {
    if (realMode !== _CLONE) {
      Vue.set(this.metadata, 'labels', { [HCI_ANNOTATIONS.OS_TYPE]: '', [HCI_ANNOTATIONS.IMAGE_SUFFIX]: '' });
      Vue.set(this.metadata, 'annotations', { [HCI_ANNOTATIONS.STORAGE_CLASS]: '' });
    }
  }

  createFromImage() {
    const router = this.currentRouter();

    router.push({
      name:   `${ HARVESTER_PRODUCT }-c-cluster-resource-create`,
      params: { resource: HCI.VM },
      query:  { image: this.id, fromPage: HCI.IMAGE }
    });
  }

  cleanForNew() {
    this.$dispatch(`cleanForNew`, this);

    delete this.spec.displayName;
  }

  get nameDisplay() {
    return this.spec?.displayName;
  }

  get isOSImage() {
    return this?.metadata?.annotations?.[HCI_ANNOTATIONS.OS_UPGRADE_IMAGE] === 'True';
  }

  get isReady() {
    return isReady.call(this);
  }

  get stateDisplay() {
    const initialized = this.getStatusConditionOfType('Initialized');
    const imported = this.getStatusConditionOfType('Imported');

    if (imported?.status === 'Unknown') {
      if (this.spec.sourceType === 'restore') {
        return 'Restoring';
      }

      if (this.spec.sourceType === 'download') {
        return 'Downloading';
      }

      if (this.spec.sourceType === 'upload') {
        if (this.uploadError) {
          return 'Failed';
        }

        return 'Uploading';
      }

      return 'Exporting';
    }

    if (initialized?.message || imported?.message) {
      return 'Failed';
    }

    return stateDisplay(this.metadata.state.name);
  }

  get encryptionSecret() {
    const secretNS = this.spec.storageClassParameters[CSI_PROVISIONER_SECRET_NAMESPACE];
    const secretName = this.spec.storageClassParameters[CSI_PROVISIONER_SECRET_NAME];

    if (secretNS && secretName) {
      return `${ secretNS }/${ secretName }`;
    }

    return '';
  }

  get isEncrypted() {
    return this.spec.sourceType === 'clone' &&
    this.spec.securityParameters?.cryptoOperation === 'encrypt' &&
    !!this.spec.securityParameters?.sourceImageName &&
    !!this.spec.securityParameters?.sourceImageNamespace;
  }

  get displayNameWithNamespace() {
    return `${ this.metadata.namespace }/${ this.spec.displayName }`;
  }

  get imageMessage() {
    if (this.uploadError) {
      return ucFirst(this.uploadError);
    }

    const conditions = this?.status?.conditions || [];
    const initialized = conditions.find( cond => cond.type === 'Initialized');
    const imported = conditions.find( cond => cond.type === 'Imported');
    const retryLimitExceeded = conditions.find( cond => cond.type === 'RetryLimitExceeded');
    const message = initialized?.message || imported?.message || retryLimitExceeded?.message;

    return ucFirst(message);
  }

  get stateBackground() {
    return colorForState(this.stateDisplay).replace('text-', 'bg-');
  }

  get imageSource() {
    return get(this, `spec.sourceType`) || 'download';
  }

  get progress() {
    return this?.status?.progress || 0;
  }

  get annotationsToIgnoreRegexes() {
    return [DESCRIPTION].concat(ANNOTATIONS_TO_IGNORE_REGEX);
  }

  get downSize() {
    const size = this.status?.size;

    if (!size) {
      return '-';
    }

    return formatSi(size, {
      increment:    1024,
      maxPrecision: 2,
      suffix:       'B',
      firstSuffix:  'B',
    });
  }

  get virtualSize() {
    const virtualSize = this.status?.virtualSize;

    if (!virtualSize) {
      return '-';
    }

    return formatSi(virtualSize, {
      increment:    1024,
      maxPrecision: 2,
      suffix:       'B',
      firstSuffix:  'B',
    });
  }

  getStatusConditionOfType(type, defaultValue = []) {
    const conditions = Array.isArray(get(this, 'status.conditions')) ? this.status.conditions : defaultValue;

    return conditions.find( cond => cond.type === type);
  }

  get stateObj() {
    const state = clone(this.metadata?.state);
    const initialized = this.getStatusConditionOfType('Initialized');
    const imported = this.getStatusConditionOfType('Imported');

    if ([initialized?.status, imported?.status].includes('False') || this.uploadError) {
      state.error = true;
    }

    return state;
  }

  get stateDescription() {
    return this.imageMessage;
  }

  get displayName() {
    return this.spec?.displayName;
  }

  get storageClassName() {
    return this.status?.storageClassName || '';
  }

  get uploadImage() {
    return async(file) => {
      const formData = new FormData();

      formData.append('chunk', file);

      try {
        this.$ctx.commit('harvester-common/uploadStart', this.metadata.name, { root: true });

        await this.doAction('upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'File-Size':    file.size,
          },
          params: { size: file.size },
        });
      } catch (err) {
        this.$ctx.commit('harvester-common/uploadError', { name: this.name, message: err.message }, { root: true });

        this.$ctx.commit('harvester-common/uploadEnd', this.metadata.name, { root: true });

        return Promise.reject(err);
      }

      this.$ctx.commit('harvester-common/uploadEnd', this.metadata.name, { root: true });
    };
  }

  get uploadError() {
    return this.$rootGetters['harvester-common/uploadingImageError'](this.name);
  }

  get imageSuffix() {
    return this.metadata?.labels?.[HCI_ANNOTATIONS.IMAGE_SUFFIX];
  }

  get imageOSType() {
    return this.metadata?.labels?.[HCI_ANNOTATIONS.OS_TYPE];
  }

  get customValidationRules() {
    const out = [];

    if (this.imageSource === 'download') {
      const urlFormat = {
        nullable:   false,
        path:       'spec.url',
        validators: ['imageUrl'],
      };

      const urlRequired = {
        nullable:       false,
        path:           'spec.url',
        required:       true,
        translationKey: 'harvester.image.url'
      };

      out.push(urlFormat, urlRequired);
    }

    if (this.imageSource === 'upload') {
      const fileRequired = {
        nullable:   false,
        path:       'metadata.annotations',
        validators: ['fileRequired'],
      };

      out.push(fileRequired);
    }

    if (this.spec?.checksum?.length) {
      const checksumFormat = {
        path:       'spec.checksum',
        validators: ['hashSHA512'],
      };

      out.push(checksumFormat);
    }

    return [
      {
        nullable:       false,
        path:           'spec.displayName',
        required:       true,
        minLength:      1,
        maxLength:      63,
        translationKey: 'generic.name',
      },
      ...out
    ];
  }

  download() {
    window.location.href = this.links.download;
  }
}
