<script>
import NameNsDescription from '@shell/components/form/NameNsDescription';
import ResourceTabs from '@shell/components/form/ResourceTabs';
import Tab from '@shell/components/Tabbed/Tab';
import CreateEditView from '@shell/mixins/create-edit-view';
import { NETWORK_ATTACHMENT, CAPI } from '@shell/config/types';
import { allHash } from '@shell/utils/promise';
import CruResource from '@shell/components/CruResource';
import Range from './Range';
import Selector from './Selector';
import { HCI } from '@pkg/harvester/types';

export default {
  name: 'HarvesterIPPool',

  components: {
    NameNsDescription,
    ResourceTabs,
    Tab,
    CruResource,
    Range,
    Selector,
  },

  mixins: [CreateEditView],

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;

    const hash = {
      networks: this.$store.dispatch(`${ inStore }/findAll`, { type: NETWORK_ATTACHMENT }),
      settings: this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.SETTING }),
    };

    if (this.$store.getters['management/schemaFor'](HCI.HARVESTER_CONFIG)) {
      hash.harvesterConfigs = this.$store.dispatch(`management/findAll`, { type: HCI.HARVESTER_CONFIG });
    }

    if (this.$store.getters['management/schemaFor'](CAPI.RANCHER_CLUSTER)) {
      hash.rancherClusters = this.$store.dispatch(`management/findAll`, { type: CAPI.RANCHER_CLUSTER });
    }

    await allHash(hash);
  },

  data() {
    return { errors: [] };
  },

  computed: {
    yamlModifiers() {
      const activelyRemove = [
        'metadata.managedFields',
        'metadata.relationships',
        'metadata.state',
        'links',
        'type',
        'id'
      ];

      if (this.isCreate) {
        activelyRemove.push('status');
      }

      return { activelyRemove };
    },
  },
};
</script>

<template>
  <CruResource
    :done-route="doneRoute"
    :resource="value"
    :mode="mode"
    :errors="errors"
    :apply-hooks="applyHooks"
    :yaml-modifiers="yamlModifiers"
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
        <Selector
          v-model="value.spec.selector"
          :mode="mode"
        />
      </Tab>
    </ResourceTabs>
  </CruResource>
</template>
