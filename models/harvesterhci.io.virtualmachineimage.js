import { HCI } from '@/config/types';
import {
  DESCRIPTION,
  ANNOTATIONS_TO_IGNORE_REGEX,
  HCI as HCI_ANNOTATIONS
} from '@/config/labels-annotations';
import { get } from '@/utils/object';
import { findBy } from '@/utils/array';

export default {
  availableActions() {
    let out = this._standardActions;
    const toFilter = ['goToEditYaml'];

    out = out.filter( A => !toFilter.includes(A.action));

    return [
      {
        action:     'createFromImage',
        enabled:    this.isReady,
        icon:       'icon icon-fw icon-spinner',
        label:      this.t('harvester.action.createVM'),
      },
      ...out
    ];
  },

  createFromImage() {
    return () => {
      const router = this.currentRouter();

      const image = `${ this.metadata.namespace }/${ this.spec.displayName }`;

      router.push({
        name:   `c-cluster-product-resource-create`,
        params: { resource: HCI.VM },
        query:  { image }
      });
    };
  },

  nameDisplay() {
    return this.spec?.displayName;
  },

  isReady() {
    const conditions = get(this, 'status.conditions');

    return (findBy(conditions, 'type', 'Initialized') || {})?.status === 'True';
  },

  stateDisplay() {
    const conditions = get(this, 'status.conditions');
    const Initialized = (findBy(conditions, 'type', 'Initialized') || {});

    return this.isReady ? 'Active' : Initialized?.message ? 'Failed' : 'In-progress';
  },

  resourcesStatus() {
    const imageList = this.$rootGetters['virtual/all'](HCI.IMAGE);

    let warningCount = 0;
    let errorCount = 0;

    imageList.forEach((item) => {
      const conditions = get(item, 'status.conditions');
      const status = (findBy(conditions, 'type', 'imported') || {})?.status;

      if (status === 'False') {
        errorCount += 1;
      } else if (status === 'Unknown') {
        warningCount += 1;
      }
    });

    return {
      warningCount,
      errorCount
    };
  },

  warningCount() {
    return this.resourcesStatus.warningCount;
  },

  errorCount() {
    return this.resourcesStatus.errorCount;
  },

  imageSource() {
    return get(this.value, `metadata.annotations."${ HCI_ANNOTATIONS.IMAGE_SOURCE }"`) || 'url'; // url is default source
  },

  annotationsToIgnoreRegexes() {
    return [DESCRIPTION].concat(ANNOTATIONS_TO_IGNORE_REGEX);
  },

  customValidationRules() {
    const out = [];

    if (this.imageSource === 'url') {
      const urlFormat = {
        nullable:       false,
        path:           'spec.url',
        validators:     ['imageUrl'],
      };

      const urlRequired = {
        nullable:       false,
        path:           'spec.url',
        required:       true,
        translationKey: 'harvester.image.url'
      };

      out.push(urlFormat, urlRequired);
    }

    if (this.imageSource === 'file') {
      // File is required!
    }

    return [
      {
        nullable:       false,
        path:           'spec.displayName',
        required:       true,
        minLength:      1,
        maxLength:      63,
        translationKey: 'generic.name'
      },
      {
        nullable:       false,
        path:           'spec.displayName',
        required:       true,
        translationKey: 'generic.name'
      },
      ...out
    ];
  },
};
