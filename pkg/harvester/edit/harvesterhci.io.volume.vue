<script>
import Tab from '@shell/components/Tabbed/Tab';
import SortableTable from '@shell/components/SortableTable';
import CruResource from '@shell/components/CruResource';
import UnitInput from '@shell/components/form/UnitInput';
import ResourceTabs from '@shell/components/form/ResourceTabs';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { LabeledInput } from '@components/Form/LabeledInput';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import { Banner } from '@components/Banner';
import { allHash } from '@shell/utils/promise';
import { get } from '@shell/utils/object';
import { HCI, VOLUME_SNAPSHOT } from '../types';
import { STORAGE_CLASS, LONGHORN, PV } from '@shell/config/types';
import { sortBy } from '@shell/utils/sort';
import { saferDump } from '@shell/utils/create-yaml';
import { InterfaceOption, VOLUME_DATA_SOURCE_KIND } from '../config/harvester-map';
import { _CREATE, _EDIT } from '@shell/config/query-params';
import CreateEditView from '@shell/mixins/create-edit-view';
import { HCI as HCI_ANNOTATIONS } from '@pkg/harvester/config/labels-annotations';
import { STATE, NAME, AGE, NAMESPACE } from '@shell/config/table-headers';
import { LVM_DRIVER } from '../models/harvester/storage.k8s.io.storageclass';
import { DATA_ENGINE_V2 } from '../models/harvester/persistentvolumeclaim';

export default {
  name: 'HarvesterVolume',

  components: {
    Banner,
    Tab,
    UnitInput,
    CruResource,
    SortableTable,
    ResourceTabs,
    LabeledSelect,
    LabeledInput,
    NameNsDescription,
  },

  mixins: [CreateEditView],

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;
    const _hash = {
      images:    this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.IMAGE }),
      snapshots: this.$store.dispatch(`${ inStore }/findAll`, { type: VOLUME_SNAPSHOT }),
      storages:  this.$store.dispatch(`${ inStore }/findAll`, { type: STORAGE_CLASS }),
      pvs:       this.$store.dispatch(`${ inStore }/findAll`, { type: PV }),
    };

    if (this.$store.getters[`${ inStore }/schemaFor`](LONGHORN.VOLUMES)) {
      _hash.longhornVolumes = this.$store.dispatch(`${ inStore }/findAll`, { type: LONGHORN.VOLUMES });
    }

    if (this.$store.getters[`${ inStore }/schemaFor`](LONGHORN.ENGINES)) {
      _hash.longhornEngines = this.$store.dispatch(`${ inStore }/findAll`, { type: LONGHORN.ENGINES });
    }

    const hash = await allHash(_hash);

    this.snapshots = hash.snapshots;
    this.images = hash.images;

    const defaultStorage = this.$store.getters[`harvester/all`](STORAGE_CLASS).find( O => O.isDefault);

    this.$set(this.value.spec, 'storageClassName', this.value?.spec?.storageClassName || defaultStorage?.metadata?.name || 'longhorn');
  },

  data() {
    if (this.mode === _CREATE) {
      this.value.spec.volumeMode = 'Block';
      this.value.spec.accessModes = ['ReadWriteMany'];
    }

    const storage = this.value?.spec?.resources?.requests?.storage || null;
    const imageId = get(this.value, `metadata.annotations."${ HCI_ANNOTATIONS.IMAGE_ID }"`);
    const source = !imageId ? 'blank' : 'url';

    return {
      source,
      storage,
      imageId,
      snapshots: [],
      images:    [],
    };
  },

  created() {
    this.registerBeforeHook(this.willSave, 'willSave');
  },

  computed: {
    isBlank() {
      return this.source === 'blank';
    },

    isEdit() {
      return this.mode === _EDIT;
    },

    isVMImage() {
      return this.source === 'url';
    },

    sourceOption() {
      return [{
        value: 'blank',
        label: this.t('harvester.volume.sourceOptions.new')
      }, {
        value: 'url',
        label: this.t('harvester.volume.sourceOptions.vmImage')
      }];
    },

    interfaceOption() {
      return InterfaceOption;
    },

    imageOption() {
      return sortBy(
        this.images
          .filter(obj => obj.isReady)
          .map((obj) => {
            return {
              label: `${ obj.metadata.namespace }/${ obj.spec.displayName }`,
              value: obj.id
            };
          }),
        'label'
      );
    },

    snapshotHeaders() {
      return [
        STATE,
        NAME,
        NAMESPACE,
        {
          name:          'size',
          labelKey:      'tableHeaders.size',
          value:         'status.restoreSize',
          sort:          'size',
          formatter:     'Si',
          formatterOpts: {
            opts: {
              increment: 1024, addSuffix: true, maxExponent: 3, minExponent: 3, suffix: 'i',
            },
            needParseSi: true
          },
        },
        {
          name:      'readyToUse',
          labelKey:  'tableHeaders.readyToUse',
          value:     'status.readyToUse',
          align:     'left',
          formatter: 'Checked',
        },
        AGE
      ];
    },

    dataSourceKind() {
      return VOLUME_DATA_SOURCE_KIND[this.value.spec?.dataSource?.kind];
    },

    storageClasses() {
      const inStore = this.$store.getters['currentProduct'].inStore;

      return this.$store.getters[`${ inStore }/all`](STORAGE_CLASS);
    },

    storageClassOptions() {
      return this.storageClasses.filter(s => !s.parameters?.backingImage).map((s) => {
        const label = s.isDefault ? `${ s.name } (${ this.t('generic.default') })` : s.name;

        return {
          label,
          value: s.name,
        };
      }) || [];
    },

    frontend() {
      return this.value.longhornVolume?.spec?.frontend;
    },

    frontendDisplay() {
      const format = ['blockdev'];

      if (format.includes(this.frontend)) {
        return this.t(`harvester.volume.${ this.frontend }`);
      }

      return this.frontend;
    },

    attachedNode() {
      return this.value.longhornVolume?.spec?.nodeID;
    },

    endpoint() {
      return this.value.longhornEngine?.status?.endpoint;
    },

    diskTags() {
      return this.value.longhornVolume?.spec?.diskSelector;
    },

    nodeTags() {
      return this.value.longhornVolume?.spec?.nodeSelector;
    },

    replicasNumber() {
      return this.value.longhornVolume?.spec?.numberOfReplicas;
    },

    lastBackup() {
      return this.value.longhornVolume?.status?.lastBackup;
    },

    lastBackupAt() {
      return this.value.longhornVolume?.status?.lastBackupAt;
    },

    rebuildStatus() {
      return this.value.longhornEngine?.status?.rebuildStatus;
    }
  },

  methods: {
    getAccessMode() {
      const storageClassName = this.value.spec.storageClassName;
      const storageClass = this.storageClasses.find(sc => sc.name === storageClassName);

      let readWriteOnce = this.value.isLvm || this.value.isLonghornV2;

      if (storageClass) {
        readWriteOnce = storageClass.provisioner === LVM_DRIVER || storageClass.parameters?.dataEngine === DATA_ENGINE_V2;
      }

      return readWriteOnce ? ['ReadWriteOnce'] : ['ReadWriteMany'];
    },
    willSave() {
      this.update();
    },
    update() {
      let imageAnnotations = '';
      let storageClassName = this.value.spec.storageClassName;

      if (this.isVMImage && this.imageId) {
        const images = this.$store.getters['harvester/all'](HCI.IMAGE);

        imageAnnotations = {
          ...this.value.metadata.annotations,
          [HCI_ANNOTATIONS.IMAGE_ID]: this.imageId
        };
        storageClassName = images?.find(image => this.imageId === image.id)?.storageClassName;
      } else {
        imageAnnotations = { ...this.value.metadata.annotations };
      }

      const spec = {
        ...this.value.spec,
        resources:   { requests: { storage: this.storage } },
        storageClassName,
        accessModes: this.getAccessMode(),
      };

      this.value.setAnnotations(imageAnnotations);

      this.$set(this.value, 'spec', spec);
    },
    updateImage() {
      if (this.isVMImage && this.imageId) {
        const imageResource = this.images?.find(image => this.imageId === image.id);
        const imageSize = Math.max(imageResource?.status?.size, imageResource?.status?.virtualSize);

        if (imageSize) {
          this.storage = `${ Math.ceil(imageSize / 1024 / 1024 / 1024) }Gi`;
        }
      }
      this.update();
    },
    generateYaml() {
      const out = saferDump(this.value);

      return out;
    },
  }
};
</script>

<template>
  <CruResource
    :done-route="doneRoute"
    :resource="value"
    :mode="mode"
    :errors="errors"
    :generate-yaml="generateYaml"
    :apply-hooks="applyHooks"
    @finish="save"
  >
    <NameNsDescription :value="value" :namespaced="true" :mode="mode" />

    <ResourceTabs
      v-model="value"
      class="mt-15"
      :need-conditions="false"
      :need-related="false"
      :side-tabs="true"
      :mode="mode"
    >
      <Tab name="basic" :label="t('harvester.volume.tabs.basics')" :weight="3" class="bordered-table">
        <LabeledSelect
          v-model="source"
          :label="t('harvester.volume.source')"
          :options="sourceOption"
          :disabled="!isCreate"
          required
          :mode="mode"
          class="mb-20"
          @input="update"
        />

        <LabeledSelect
          v-if="isVMImage"
          v-model="imageId"
          :label="t('harvester.volume.image')"
          :options="imageOption"
          :disabled="!isCreate"
          required
          :mode="mode"
          class="mb-20"
          @input="updateImage"
        />

        <LabeledSelect
          v-if="source === 'blank'"
          v-model="value.spec.storageClassName"
          :options="storageClassOptions"
          :label="t('harvester.storage.storageClass.label')"
          :mode="mode"
          class="mb-20"
          :disabled="!isCreate"
          @input="update"
        />

        <UnitInput
          v-model="storage"
          v-int-number
          :label="t('harvester.volume.size')"
          :input-exponent="3"
          :output-modifier="true"
          :increment="1024"
          :mode="mode"
          :disabled="value?.isLonghornV2 && isEdit"
          required
          class="mb-20"
          @input="update"
        />

        <Banner v-if="value?.isLonghornV2 && isEdit" color="warning">
          <span>{{ t('harvester.volume.longhorn.disableResize') }}</span>
        </Banner>
      </Tab>
      <Tab v-if="!isCreate" name="details" :label="t('harvester.volume.tabs.details')" :weight="2.5" class="bordered-table">
        <LabeledInput v-model="frontendDisplay" class="mb-20" :mode="mode" :disabled="true" :label="t('harvester.volume.frontend')" />
        <LabeledInput v-model="attachedNode" class="mb-20" :mode="mode" :disabled="true" :label="t('harvester.volume.attachedNode')" />
        <LabeledInput v-model="endpoint" class="mb-20" :mode="mode" :disabled="true" :label="t('harvester.volume.endpoint')" />
        <LabeledSelect
          v-model="diskTags"
          :multiple="true"
          :label="t('harvester.volume.diskTags')"
          :options="[]"
          :disabled="true"
          :mode="mode"
          class="mb-20"
        />
        <LabeledSelect
          v-model="nodeTags"
          :multiple="true"
          :label="t('harvester.volume.nodeTags')"
          :options="[]"
          :disabled="true"
          :mode="mode"
          class="mb-20"
        />
        <LabeledInput v-model="lastBackup" class="mb-20" :mode="mode" :disabled="true" :label="t('harvester.volume.lastBackup')" />
        <LabeledInput v-model="lastBackupAt" class="mb-20" :mode="mode" :disabled="true" :label="t('harvester.volume.lastBackupAt')" />
        <LabeledInput v-model="replicasNumber" class="mb-20" :mode="mode" :disabled="true" :label="t('harvester.volume.replicasNumber')" />
      </Tab>
      <Tab v-if="!isCreate" name="instances" :label="t('harvester.volume.tabs.snapshots')" :weight="2" class="bordered-table">
        <SortableTable
          v-bind="$attrs"
          :headers="snapshotHeaders"
          default-sort-by="age"
          :rows="value.relatedVolumeSnapshotCounts"
          key-field="_key"
          v-on="$listeners"
        />
      </Tab>
      <Tab v-if="!isCreate && value.spec.dataSource" name="datasource" :label="t('harvester.volume.tabs.datasource')" :weight="1" class="bordered-table">
        <LabeledInput v-model="dataSourceKind" class="mb-20" :mode="mode" :disabled="true" :label="t('harvester.volume.kind')" />
        <LabeledInput v-model="value.spec.dataSource.name" :mode="mode" :disabled="true" :label="t('nameNsDescription.name.label')" />
      </Tab>
    </ResourceTabs>
  </CruResource>
</template>
