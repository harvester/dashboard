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
import { STORAGE_CLASS, LONGHORN, SECRET, NAMESPACE } from '@shell/config/types';
import { CSI_DRIVER } from '../../types';
import { allHash } from '@shell/utils/promise';
import { clone } from '@shell/utils/object';
import { LONGHORN_DRIVER } from '@shell/models/persistentvolume';
import { LVM_DRIVER } from '../../models/harvester/storage.k8s.io.storageclass';
import { DATA_ENGINE_V1, DATA_ENGINE_V2 } from '../../models/harvester/persistentvolumeclaim';

const LONGHORN_V2_DATA_ENGINE = 'longhorn-system/v2-data-engine';

export const LVM_TOPOLOGY_LABEL = 'topology.lvm.csi/node';

const VOLUME_BINDING_MODE_IMMEDIATE = 'Immediate';
const VOLUME_BINDING_MODE_WAIT = 'WaitForFirstConsumer';

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
        value: VOLUME_BINDING_MODE_IMMEDIATE
      },
      {
        label: this.t('harvester.storage.customize.volumeBindingMode.later'),
        value: VOLUME_BINDING_MODE_WAIT
      }
    ];

    const allowedTopologies = clone(this.value.allowedTopologies?.[0]?.matchLabelExpressions || []).filter(t => t.key !== LVM_TOPOLOGY_LABEL);

    this.$set(this.value, 'parameters', this.value.parameters || {});
    this.$set(this.value, 'provisioner', this.value.provisioner || LONGHORN_DRIVER);
    this.$set(this.value, 'allowVolumeExpansion', this.value.allowVolumeExpansion || allowVolumeExpansionOptions[0].value);
    this.$set(this.value, 'reclaimPolicy', this.value.reclaimPolicy || reclaimPolicyOptions[0].value);

    if (this.value.provisioner === LONGHORN_DRIVER) {
      this.$set(this.value.parameters, 'dataEngine', this.value.longhornVersion);
      this.$set(this.value, 'volumeBindingMode', this.value.volumeBindingMode || VOLUME_BINDING_MODE_IMMEDIATE);
    }

    if (this.value.provisioner === LVM_DRIVER) {
      this.$set(this.value, 'volumeBindingMode', this.value.volumeBindingMode || VOLUME_BINDING_MODE_WAIT);
    }

    let provisioner = `${ this.value.provisioner || LONGHORN_DRIVER }`;

    if (provisioner === LONGHORN_DRIVER) {
      provisioner = `${ provisioner }_${ this.value.longhornVersion }`;
    }

    return {
      LVM_DRIVER,
      reclaimPolicyOptions,
      allowVolumeExpansionOptions,
      volumeBindingModeOptions,
      mountOptions:    [],
      STORAGE_CLASS,
      provisioner,
      allowedTopologies,
      defaultAddValue: {
        key:    '',
        values: [],
      },
    };
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;

    await allHash({
      namespaces:           this.$store.dispatch(`${ inStore }/findAll`, { type: NAMESPACE }),
      secrets:              this.$store.dispatch(`${ inStore }/findAll`, { type: SECRET }),
      storages:             this.$store.dispatch(`${ inStore }/findAll`, { type: STORAGE_CLASS }),
      longhornNodes:        this.$store.dispatch(`${ inStore }/findAll`, { type: LONGHORN.NODES }),
      csiDrivers:           this.$store.dispatch(`${ inStore }/findAll`, { type: CSI_DRIVER }),
      longhornV2DataEngine: this.$store.dispatch(`${ inStore }/find`, { type: LONGHORN.SETTINGS, id: LONGHORN_V2_DATA_ENGINE }),
    });
  },

  computed: {
    showUnsupportedStorage: mapFeature(UNSUPPORTED_STORAGE_DRIVERS),

    inStore() {
      return this.$store.getters['currentProduct'].inStore;
    },

    modeOverride() {
      return this.isCreate ? _CREATE : _VIEW;
    },

    provisioners() {
      const out = [];

      const inStore = this.$store.getters['currentProduct'].inStore;
      const csiDrivers = this.$store.getters[`${ inStore }/all`](CSI_DRIVER) || [];

      csiDrivers.forEach(({ name }) => {
        switch (name) {
        case LONGHORN_DRIVER:
          out.push({
            label: `harvester.storage.storageClass.longhorn.${ DATA_ENGINE_V1 }.label`,
            value: `${ name }_${ DATA_ENGINE_V1 }`,
          });

          if (this.longhornSystemVersion === DATA_ENGINE_V2 || this.value.longhornVersion === DATA_ENGINE_V2) {
            out.push({
              label: `harvester.storage.storageClass.longhorn.${ DATA_ENGINE_V2 }.label`,
              value: `${ name }_${ DATA_ENGINE_V2 }`,
            });
          }
          break;
        case LVM_DRIVER:
          out.push({
            label: 'harvester.storage.storageClass.lvm.label',
            value: name,
          });
          break;
        }
      });

      return out;
    },

    schema() {
      const inStore = this.$store.getters['currentProduct'].inStore;

      return this.$store.getters[`${ inStore }/schemaFor`](STORAGE_CLASS);
    },

    longhornSystemVersion() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const v2DataEngine = this.$store.getters[`${ inStore }/byId`](LONGHORN.SETTINGS, LONGHORN_V2_DATA_ENGINE) || {};

      return v2DataEngine.value === 'true' ? DATA_ENGINE_V2 : DATA_ENGINE_V1;
    },
  },

  watch: {
    provisioner(neu) {
      const [provisioner, dataEngine] = neu?.split('_');

      let parameters = {};

      if (provisioner === LVM_DRIVER) {
        const matchLabelExpressions = (this.value.allowedTopologies?.[0]?.matchLabelExpressions || []).filter(t => t.key !== LVM_TOPOLOGY_LABEL);

        if (matchLabelExpressions.length > 0) {
          this.$set(this.value, 'allowedTopologies', [{ matchLabelExpressions }]);
        } else {
          delete this.value.allowedTopologies;
        }

        this.$set(this.value, 'volumeBindingMode', VOLUME_BINDING_MODE_WAIT);
      }

      if (provisioner === LONGHORN_DRIVER) {
        parameters = { dataEngine };
        this.$set(this.value, 'volumeBindingMode', VOLUME_BINDING_MODE_IMMEDIATE);
      }

      this.$set(this.value, 'provisioner', provisioner);
      this.$set(this.value, 'allowVolumeExpansion', this.value.provisioner === LONGHORN_DRIVER);
      this.$set(this.value, 'parameters', parameters);
    }
  },

  created(neu) {
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

    willSave() {
      Object.keys(this.value.parameters).forEach((key) => {
        if (this.value.parameters[key] === null || this.value.parameters[key] === '') {
          delete this.value.parameters[key];
        }
      });

      this.formatAllowedTopoloties();
    },

    formatAllowedTopoloties() {
      const neu = this.allowedTopologies.filter(t => t.key !== LVM_TOPOLOGY_LABEL);
      const lvmMatchExpression = (this.value.allowedTopologies?.[0]?.matchLabelExpressions || []).filter(t => t.key === LVM_TOPOLOGY_LABEL);

      if (!neu || neu.length === 0) {
        if (lvmMatchExpression.length > 0) {
          this.value.allowedTopologies = [{ matchLabelExpressions: lvmMatchExpression }];
        } else {
          delete this.value.allowedTopologies;
        }

        return;
      }

      const matchLabelExpressions = neu.filter(R => !!R.key.trim() && (R.values.length > 0 && !R.values.find(V => !V.trim())));

      if (matchLabelExpressions.length > 0) {
        this.value.allowedTopologies = [{ matchLabelExpressions: [...matchLabelExpressions, ...lvmMatchExpression] }];
      }
    }
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
    :apply-hooks="applyHooks"
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
      v-model="provisioner"
      label="Provisioner"
      :options="provisioners"
      :localized-label="true"
      :mode="modeOverride"
      :searchable="true"
      :taggable="true"
      class="mb-20"
    />
    <Tabbed :side-tabs="true">
      <Tab name="parameters" :label="t('storageClass.parameters.label')" :weight="2">
        <component
          :is="getComponent(provisioner)"
          :key="provisioner"
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
              :disabled="provisioner === LVM_DRIVER"
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
          :mode="modeOverride"
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
                  :mode="modeOverride"
                />
              </div>
              <div class="col span-8 value">
                <Tags
                  v-model="scope.row.value.values"
                  :add-label="t('generic.add')"
                  :mode="modeOverride"
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
