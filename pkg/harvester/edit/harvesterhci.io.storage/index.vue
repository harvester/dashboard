<script>
import CreateEditView from '@shell/mixins/create-edit-view';
import CruResource from '@shell/components/CruResource';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import Tags from '../../components/DiskTags';
import ArrayList from '@shell/components/form/ArrayList';
import Tab from '@shell/components/Tabbed/Tab';
import Tabbed from '@shell/components/Tabbed';
import { RadioGroup } from '@components/Form/Radio';

import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import Loading from '@shell/components/Loading';

import { _CREATE, _VIEW } from '@shell/config/query-params';
import { mapFeature, UNSUPPORTED_STORAGE_DRIVERS } from '@shell/store/features';
import { STORAGE_CLASS, LONGHORN } from '@shell/config/types';
import { CSI_DRIVER } from '../../types';
import { allHash } from '@shell/utils/promise';
import { clone } from '@shell/utils/object';

const LONGHORN_DRIVER = 'driver.longhorn.io';

export default {
  name: 'HarvesterStorage',

  components: {
    ArrayList,
    CruResource,
    LabeledSelect,
    LabeledInput,
    NameNsDescription,
    RadioGroup,
    Tab,
    Tabbed,
    Loading,
    Tags,
  },

  mixins: [CreateEditView],

  data() {
    const reclaimPolicyOptions = [{
      label: this.t('storageClass.customize.reclaimPolicy.delete'),
      value: 'Delete'
    }, {
      label: this.t('storageClass.customize.reclaimPolicy.retain'),
      value: 'Retain'
    }];

    const allowVolumeExpansionOptions = [
      {
        label: this.t('generic.enabled'),
        value: true
      },
      {
        label: this.t('generic.disabled'),
        value: false
      }
    ];

    const volumeBindingModeOptions = [
      {
        label: this.t('storageClass.customize.volumeBindingMode.now'),
        value: 'Immediate'
      },
      {
        label: this.t('harvester.storage.customize.volumeBindingMode.later'),
        value: 'WaitForFirstConsumer'
      }
    ];

    const allowedTopologies = clone(this.value.allowedTopologies?.[0]?.matchLabelExpressions || []);

    this.$set(this.value, 'parameters', this.value.parameters || {});
    this.$set(this.value, 'provisioner', this.value.provisioner || LONGHORN_DRIVER);
    this.$set(this.value, 'allowVolumeExpansion', this.value.allowVolumeExpansion || allowVolumeExpansionOptions[0].value);
    this.$set(this.value, 'reclaimPolicy', this.value.reclaimPolicy || reclaimPolicyOptions[0].value);
    this.$set(this.value, 'volumeBindingMode', this.value.volumeBindingMode || volumeBindingModeOptions[0].value);

    return {
      reclaimPolicyOptions,
      allowVolumeExpansionOptions,
      volumeBindingModeOptions,
      mountOptions:    [],
      provisioner:     LONGHORN_DRIVER,
      STORAGE_CLASS,
      allowedTopologies,
      defaultAddValue: {
        key:    '',
        values: [],
      }
    };
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;

    const hash = {
      storages:      this.$store.dispatch(`${ inStore }/findAll`, { type: STORAGE_CLASS }),
      longhornNodes: this.$store.dispatch(`${ inStore }/findAll`, { type: LONGHORN.NODES }),
      csiDrivers:    this.$store.dispatch(`${ inStore }/findAll`, { type: CSI_DRIVER }),
    };

    await allHash(hash);
  },

  computed: {
    showUnsupportedStorage: mapFeature(UNSUPPORTED_STORAGE_DRIVERS),

    inStore() {
      return this.$store.getters['currentProduct'].inStore;
    },

    modeOverride() {
      return this.isCreate ? _CREATE : _VIEW;
    },

    provisionerWatch() {
      return this.value.provisioner;
    },

    provisioners() {
      const csiDrivers = this.$store.getters[`${ this.inStore }/all`](CSI_DRIVER) || [];

      return csiDrivers.map((provisioner) => {
        return {
          label: provisioner.name,
          value: provisioner.name,
        };
      });
    },

    schema() {
      const inStore = this.$store.getters['currentProduct'].inStore;

      return this.$store.getters[`${ inStore }/schemaFor`](STORAGE_CLASS);
    },
  },

  watch: {
    provisionerWatch() {
      this.$set(this.value, 'parameters', {});
    },

    allowedTopologies(neu) {
      if (!neu || neu.length === 0) {
        delete this.value.allowedTopologies;

        return;
      }

      this.value.allowedTopologies = [{ matchLabelExpressions: neu }];
    }
  },

  created() {
    this.registerBeforeHook(this.willSave, 'willSave');
  },

  methods: {
    getComponent(name) {
      try {
        return require(`./provisioners/${ name }`).default;
      } catch {
        return require(`./provisioners/custom`).default;
      }
    },

    updateProvisioner(provisioner) {
      this.$set(this.value, 'provisioner', provisioner);
      this.$set(this.value, 'allowVolumeExpansion', provisioner === LONGHORN_DRIVER);
    },

    willSave() {
      Object.keys(this.value.parameters).forEach((key) => {
        if (this.value.parameters[key] === null || this.value.parameters[key] === '') {
          delete this.value.parameters[key];
        }
      });
    },
  }
};
</script>

<template>
  <Loading v-if="$fetchState.pending" />
  <CruResource
    v-else
    :done-route="doneRoute"
    :mode="mode"
    :resource="value"
    :subtypes="[]"
    :validation-passed="true"
    :errors="errors"
    @error="e=>errors = e"
    @finish="save"
    @cancel="done"
  >
    <NameNsDescription
      :namespaced="false"
      :value="value"
      :mode="mode"
      :register-before-hook="registerBeforeHook"
    />
    <LabeledSelect
      :value="value.provisioner"
      label="Provisioner"
      :options="provisioners"
      :localized-label="true"
      :mode="modeOverride"
      :searchable="true"
      :taggable="true"
      class="mb-20"
      @input="updateProvisioner($event)"
    />
    <Tabbed :side-tabs="true">
      <Tab name="parameters" :label="t('storageClass.parameters.label')" :weight="2">
        <component
          :is="getComponent(value.provisioner)"
          :key="value.provisioner"
          :value="value"
          :mode="modeOverride"
          :real-mode="realMode"
        />
      </Tab>
      <Tab name="customize" :label="t('storageClass.customize.label')">
        <div class="row mt-20">
          <div class="col span-6">
            <RadioGroup
              v-model="value.reclaimPolicy"
              name="reclaimPolicy"
              :label="t('storageClass.customize.reclaimPolicy.label')"
              :mode="modeOverride"
              :options="reclaimPolicyOptions"
            />
          </div>
          <div class="col span-6">
            <RadioGroup
              v-model="value.allowVolumeExpansion"
              name="allowVolumeExpansion"
              :label="t('storageClass.customize.allowVolumeExpansion.label')"
              :mode="modeOverride"
              :options="allowVolumeExpansionOptions"
            />
          </div>
        </div>
        <div class="row mt-20">
          <div class="col span-6">
            <RadioGroup
              v-model="value.volumeBindingMode"
              name="volumeBindingMode"
              :label="t('storageClass.customize.volumeBindingMode.label')"
              :mode="modeOverride"
              :options="volumeBindingModeOptions"
            />
          </div>
        </div>
      </Tab>
      <Tab
        name="allowedTopologies"
        :label="t('harvester.storage.allowedTopologies.title')"
        :weight="-1"
        :tooltip="t('harvester.storage.allowedTopologies.tooltip')"
      >
        <ArrayList
          v-model="allowedTopologies"
          :default-add-value="defaultAddValue"
          :initial-empty-row="true"
          :show-header="true"
        >
          <template v-slot:column-headers>
            <div class="box">
              <div class="row">
                <div class="col span-4 key">
                  {{ t('generic.key') }}
                  <span class="required">*</span>
                </div>
                <div class="col span-8 value">
                  {{ t('generic.value') }}
                </div>
              </div>
            </div>
          </template>
          <template v-slot:columns="scope">
            <div class="row custom-headers">
              <div class="col span-4 key">
                <LabeledInput
                  v-model="scope.row.value.key"
                  :required="true"
                />
              </div>
              <div class="col span-8 value">
                <Tags
                  v-model="scope.row.value.values"
                  :add-label="t('generic.add')"
                  :mode="mode"
                />
              </div>
            </div>
          </template>
        </ArrayList>
      </Tab>
    </Tabbed>
  </CruResource>
</template>

<style lang="scss" scoped>
  .custom-headers {
    align-items: center;
  }
</style>
