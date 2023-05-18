<script>
import NameNsDescription from '@shell/components/form/NameNsDescription';
import ResourceTabs from '@shell/components/form/ResourceTabs';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { LabeledInput } from '@components/Form/LabeledInput';
import Tab from '@shell/components/Tabbed/Tab';
import CreateEditView from '@shell/mixins/create-edit-view';
import { NETWORK_ATTACHMENT, CAPI } from '@shell/config/types';
import { allHash } from '@shell/utils/promise';
import CruResource from '@shell/components/CruResource';
import Range from './Range';
import Priority from './Priority';
import { uniq } from '@shell/utils/array';
import { HCI } from '@pkg/harvester/types';

export default {
  name: 'HarvesterIPPool',

  components: {
    NameNsDescription,
    ResourceTabs,
    LabeledSelect,
    Tab,
    CruResource,
    Range,
    Priority,
    LabeledInput,
  },

  mixins: [CreateEditView],

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;

    const hash = { networks: this.$store.dispatch(`${ inStore }/findAll`, { type: NETWORK_ATTACHMENT }) };

    if (this.$store.getters['management/schemaFor'](HCI.HARVESTER_CONFIG)) {
      hash.harvesterConfigs = this.$store.dispatch(`management/findAll`, { type: HCI.HARVESTER_CONFIG });
    }

    if (this.$store.getters['management/schemaFor'](CAPI.RANCHER_CLUSTER)) {
      hash.rancherClusters = this.$store.dispatch(`management/findAll`, { type: CAPI.RANCHER_CLUSTER });
    }

    await allHash(hash);
  },

  created() {
    this.registerBeforeHook(this.validate, 'validate');
    this.registerBeforeHook(this.willSave, 'willSave');
  },

  data() {
    return { namespaceRow: this.value.spec.selector.projects?.[0]?.namespaces || [] };
  },

  computed: {
    networkOptions() {
      const networks = this.$store.getters['harvester/all'](NETWORK_ATTACHMENT) || [];

      return [{
        label: this.t('generic.none'),
        value: '',
      }, ...networks.map(n => ({
        label: n.id,
        value: n.id,
      }))];
    },
  },

  methods: {
    validate() {
      const errors = [];
      const ranges = this.value.spec?.ranges || [];

      if (ranges.length === 0) {
        errors.push(this.t('validation.required', { key: this.t('harvester.ipPool.tabs.range') }, true));
      }

      ranges.map((r) => {
        if (!r.subnet) {
          errors.push(this.t('validation.required', { key: this.t('harvester.ipPool.subnet.label') }, true));
        }
      });

      if (errors.length > 0) {
        return Promise.reject(uniq(errors));
      } else {
        return Promise.resolve();
      }
    },

    willSave() {
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
    :apply-hooks="applyHooks"
    @finish="save"
  >
    <NameNsDescription
      :value="value"
      :namespaced="false"
      :mode="mode"
    />

    <ResourceTabs
      class="mt-15"
      :need-conditions="false"
      :need-related="false"
      :side-tabs="true"
      :mode="mode"
    >
      <Tab
        name="range"
        :label="t('harvester.ipPool.tabs.range')"
        :weight="98"
        class="bordered-table"
      >
        <Range
          v-model="value.spec.ranges"
          class="col span-12"
          :mode="mode"
        />
      </Tab>
      <Tab
        name="selector"
        :label="t('harvester.ipPool.tabs.selector')"
        :weight="97"
        class="bordered-table"
      >
        <div class="row mb-20">
          <div class="col span-6">
            <LabeledSelect
              v-model="value.spec.selector.network"
              :label="t('harvester.ipPool.network.label')"
              :options="networkOptions"
              :mode="mode"
            />
          </div>
          <div class="col span-6">
            <LabeledInput
              v-model.number="value.spec.selector.priority"
              :label="t('harvester.ipPool.priority.label')"
              :mode="mode"
              type="number"
              min="0"
            />
          </div>
        </div>
        <Priority
          v-model="value.spec.selector.scope"
          class="col span-12"
          :mode="mode"
        />
      </Tab>
    </ResourceTabs>
  </CruResource>
</template>
