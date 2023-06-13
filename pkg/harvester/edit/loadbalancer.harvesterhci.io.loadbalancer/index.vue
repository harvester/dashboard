<script>
import { throttle, isEmpty } from 'lodash';

import NameNsDescription from '@shell/components/form/NameNsDescription';
import ResourceTabs from '@shell/components/form/ResourceTabs';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import Tab from '@shell/components/Tabbed/Tab';
import CruResource from '@shell/components/CruResource';
import KeyValue from '@shell/components/form/KeyValue';
import Banner from '@components/Banner/Banner';

import CreateEditView from '@shell/mixins/create-edit-view';

import { MANAGEMENT, NAMESPACE } from '@shell/config/types';
import { allHash } from '@shell/utils/promise';
import { matching } from '@shell/utils/selector';
import { HCI } from '@pkg/harvester/types';

import Listeners from './Listeners';
import HealthCheck from './HealthCheck';

const NAMESPACE_SELECTOR = 'loadbalancer.harvesterhci.io/namespace';
const PROJECT_SELECTOR = 'loadbalancer.harvesterhci.io/project';

export default {
  name: 'HarvesterLoadBalancer',

  components: {
    NameNsDescription,
    ResourceTabs,
    LabeledSelect,
    Tab,
    Listeners,
    HealthCheck,
    CruResource,
    KeyValue,
    Banner,
  },

  mixins: [CreateEditView],

  props: {
    value: {
      type:     Object,
      required: true,
    }
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;

    const hash = {
      ipPools:    this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.IP_POOL }),
      namespaces: this.$store.dispatch(`${ inStore }/findAll`, { type: NAMESPACE }),
      vms:        this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.VM }),
    };

    if (this.$store.getters['management/schemaFor'](MANAGEMENT.PROJECT)) {
      hash.projects = this.$store.dispatch('management/findAll', { type: MANAGEMENT.PROJECT });
    }

    await allHash(hash);

    this.updateMatchingVMs();
  },

  data() {
    const annotations = this.value.metadata.annotations || [];

    if (!this.value.spec.healthCheck) {
      this.value.spec.healthCheck = {};
    }

    const matchingVMs = {
      matched: 0,
      matches: [],
      none:    true,
      sample:  null,
      total:   0,
    };

    return {
      ipPool:            this.value.spec.ipPool,
      projectSelector:   annotations[PROJECT_SELECTOR] || '',
      namespaceSelector: annotations[NAMESPACE_SELECTOR] || '',
      matchingVMs,
    };
  },

  computed: {
    ipamOption() {
      return [{
        label: this.t('harvester.loadBalancer.ipam.options.dhcp'),
        value: 'dhcp',
      }, {
        label: this.t('harvester.loadBalancer.ipam.options.pool'),
        value: 'pool',
      }];
    },

    ipPoolOptions() {
      const ipPools = this.$store.getters['harvester/all'](HCI.IP_POOL);

      const out = ipPools.map(ipPool => ipPool.id);

      return [{
        label: this.t('harvester.loadBalancer.ipPool.options.none'),
        value: '',
      }, ...out];
    },

    projectOptions() {
      const projects = this.$store.getters['harvester/all'](MANAGEMENT.PROJECT);

      return projects.map(project => project.id);
    },

    namespaceOptions() {
      const namespaces = this.$store.getters['harvester/all'](NAMESPACE);

      return namespaces.map(n => n.id);
    },

    backendServerSelector: {
      get() {
        const out = {};

        Object.keys(this.value.spec?.backendServerSelector || {}).map((key) => {
          out[key] = (this.value.spec.backendServerSelector[key] || []).join(',') || '';
        });

        return out;
      },

      set(value) {
        const backendServerSelector = {};

        Object.keys(value).map((key) => {
          backendServerSelector[key] = (value[key] || '').split(',');
        });

        this.$set(this.value.spec, 'backendServerSelector', backendServerSelector);
      },
    },

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

  methods: {
    update() {
      const { projectSelector, namespaceSelector } = this;

      if (projectSelector) {
        this.value.metadata.annotations[PROJECT_SELECTOR] = projectSelector;
      }

      if (namespaceSelector) {
        this.value.metadata.annotations[NAMESPACE_SELECTOR] = namespaceSelector;
      }
    },

    updateMatchingVMs: throttle(function() {
      const backendServerSelector = this.value.spec.backendServerSelector;
      const allVMs = this.$store.getters['harvester/all'](HCI.VM).filter(vm => vm.metadata.namespace === this.value.metadata.namespace);

      if (isEmpty(backendServerSelector)) {
        this.matchingVMs = {
          matched: 0,
          total:   allVMs.length,
          none:    true,
          sample:  null,
        };
      } else {
        const match = matching(allVMs, backendServerSelector, 'spec.template.metadata.labels');

        this.matchingVMs = {
          matched: match.length,
          total:   allVMs.length,
          none:    match.length === 0,
          sample:  match[0] ? match[0].nameDisplay : null,
        };
      }
    }, 250, { leading: true }),
  },

  watch: {
    backendServerSelector:      'updateMatchingVMs',
    'value.metadata.namespace': 'updateMatchingVMs',
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
      :namespaced="true"
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
        name="basic"
        :label="t('harvester.loadBalancer.tabs.basic')"
        :weight="99"
        class="bordered-table"
      >
        <div class="row">
          <div class="col span-6">
            <LabeledSelect
              v-model="value.spec.ipam"
              :label="t('harvester.loadBalancer.ipam.label')"
              :options="ipamOption"
              :mode="mode"
            />
          </div>
          <div
            v-if="value.spec.ipam === 'pool'"
            class="col span-6"
          >
            <LabeledSelect
              v-model="value.spec.ipPool"
              :label="t('harvester.loadBalancer.ipPool.label')"
              :options="ipPoolOptions"
              :mode="mode"
              @input="update"
            />
          </div>
        </div>
      </Tab>
      <Tab
        v-if="value.spec.workloadType === 'vm'"
        name="listeners"
        :label="t('harvester.loadBalancer.tabs.listeners')"
        :weight="98"
        class="bordered-table"
      >
        <Listeners
          v-model="value.spec.listeners"
          class="col span-12"
          :mode="mode"
        />
      </Tab>
      <Tab
        v-if="value.spec.workloadType === 'vm'"
        name="backendServer"
        :label="t('harvester.loadBalancer.tabs.backendServer')"
        :weight="97"
        class="bordered-table"
      >
        <div class="row">
          <div class="col span-12">
            <Banner :color="(matchingVMs.none ? 'warning' : 'success')">
              <span v-clean-html="t('harvester.loadBalancer.backendServerSelector.matchingVMs.matchesSome', matchingVMs)" />
            </Banner>
          </div>
        </div>
        <KeyValue
          v-model="backendServerSelector"
          :mode="mode"
          :read-allowed="false"
          :initial-empty-row="true"
        />
      </Tab>
      <Tab
        v-if="value.spec.workloadType === 'vm'"
        name="healthCheck"
        :label="t('harvester.loadBalancer.tabs.healthCheck')"
        :weight="96"
        class="bordered-table"
      >
        <HealthCheck
          v-model="value.spec.healthCheck"
          :mode="mode"
          :model="value"
        />
      </Tab>
    </ResourceTabs>
  </CruResource>
</template>

<style lang="scss" scoped>
 $remove: 75;
  $checkbox: 75;

  .title {
    margin-bottom: 10px;

    .read-from-file {
      float: right;
    }
  }

  .ports-headers, .ports-row{
    display: grid;
    grid-column-gap: $column-gutter;
    margin-bottom: 10px;
    align-items: center;

    &.show-protocol{
      grid-template-columns: 23% 23% 10% 15% 15% 10%;
      &:not(.show-node-port){
        grid-template-columns: 31% 31% 10% 15% 10%;
      }
    }
    &.show-node-port:not(.show-protocol){
      grid-template-columns: 28% 28% 15% 15% 10%;
    }
  }

  .ports-headers {
    color: var(--input-label);
  }

  .toggle-host-ports {
    color: var(--primary);
  }

  .remove BUTTON {
    padding: 0px;
  }

  .ports-row {
    > div {
      height: 100%;
    }

    .port-protocol ::v-deep {
      .unlabeled-select {
        .v-select.inline {
          margin-top: 2px;
        }
      }
    }
  }

  .footer {
    margin-top: 10px;
    margin-left: 5px;

    .protip {
      float: right;
      padding: 5px 0;
    }
  }
</style>
