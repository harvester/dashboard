<script>
import Loading from '@shell/components/Loading';
import LiveData from '@shell/components/formatter/LiveDate';
import ResourceTable from '@shell/components/ResourceTable';

import { HCI } from '../types';
import { allHash } from '@shell/utils/promise';
import { STATE, AGE, NAME, NAMESPACE } from '@shell/config/table-headers';

export default {
  name:       'HarvesterListTemplate',
  components: {
    ResourceTable, LiveData, Loading
  },

  props: {
    schema: {
      type:     Object,
      required: true,
    },
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;
    const hash = await allHash({
      template:        this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.VM_TEMPLATE }),
      templateVersion: this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.VM_VERSION }),
    });

    this.template = hash.template;
    this.templateVersion = hash.templateVersion;
  },

  data() {
    return {
      template:        [],
      templateVersion: [],
    };
  },

  computed: {
    headers() {
      return [
        STATE,
        NAME,
        NAMESPACE,
        {
          name:     'defaultVersion',
          value:    'id',
          labelKey: 'tableHeaders.defaultVersion'
        },
        AGE
      ];
    },

    rows() {
      return this.templateVersion;
    },

    templateWithoutVersions() {
      const out = this.template.map((T) => {
        const hasChild = !!this.rows.find(version => version?.spec?.templateId === T.id);

        return {
          ...T,
          hasChild
        };
      });

      return out;
    },

    rowsWithFakeTemplate() {
      const fakeRows = this.template.map((T) => {
        return {
          groupByLabel:     T.id,
          isFake:           true,
          mainRowKey:       T.id,
          nameDisplay:      T.id,
          groupById:        T.id,
          availableActions: T.availableActions
        };
      });

      return [...this.rows, ...fakeRows];
    },

    templateVersionSchema() {
      const inStore = this.$store.getters['currentProduct'].inStore;

      return this.$store.getters[`${ inStore }/schemaFor`](HCI.VLAN_CONFIG);
    },

    groupBy() {
      return 'spec.templateId';
    },

    groupTitleBy() {
      return HCI.VM_TEMPLATE;
    },
  },

  methods: {
    showActions(e, group) {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const resource = this.$store.getters[`${ inStore }/byId`](HCI.VM_TEMPLATE, group.key);

      this.$store.commit(`action-menu/show`, {
        resources: [resource],
        elem:      e.target
      });
    },

    valueFor(group) {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const resource = this.$store.getters[`${ inStore }/byId`](HCI.VM_TEMPLATE, group.key);

      return resource?.metadata?.creationTimestamp;
    },

    templateResource(group) {
      return group?.rows?.[0];
    },

    slotName(clusterNetwork) {
      return `main-row:${ clusterNetwork }`;
    },
  },
};
</script>

<template>
  <Loading v-if="$fetchState.pending" />
  <ResourceTable
    v-else
    v-bind="$attrs"
    :headers="headers"
    :groupable="false"
    :rows="rowsWithFakeTemplate"
    group-by="groupById"
    :schema="templateVersionSchema"
    :group-can-action="true"
    key-field="_key"
    v-on="$listeners"
  >
    <template #group-by="group">
      <div class="group-bar">
        <div class="group-tab">
          <div v-clean-html="group.group.key" class="project-name" />
        </div>

        <div class="right">
          <div class="age">
            <LiveData
              :value="valueFor(group.group)"
              :row="templateResource(group.group)"
            />
          </div>

          <button type="button" class="btn btn-sm actions mr-10 role-multi-action" @click="showActions($event, group.group)">
            <i class="icon icon-actions" />
          </button>
        </div>
      </div>
    </template>

    <template #col:defaultVersion="{row}">
      <td v-if="row.isDefaultVersion">
        <i class="icon icon-checkmark" />
      </td>
      <td v-else></td>
    </template>

    <template v-for="template in templateWithoutVersions" v-slot:[`main-row:${template.id}`]>
      <tr
        v-show="!template.hasChild"
        :key="template.id"
        class="main-row"
      >
        <td class="empty text-center" colspan="12">
          {{ t('harvester.vmTemplate.noVersion') }}
        </td>
      </tr>
    </template>
  </ResourceTable>
</template>

<style lang="scss" scoped>
::v-deep {
  .group-name {
    line-height: 30px;
  }

  .group-bar {
    display: flex;
    flex-direction: row;
    justify-content: space-between;

    .right {
      display: flex;
      align-items: center;
      .age {
        width: 100px;
      }

      .actions {
        padding-right: 7px;
      }
    }

    &.has-description {
      .right {
        margin-top: 5px;
      }
      .group-tab {
        &, &::after {
            height: 50px;
        }

        &::after {
            right: -20px;
        }

        .description {
            margin-top: -20px;
        }
      }
    }
  }
}
</style>
