<script>
import Row from './NamespaceRow';
import { QUOTA_COMPUTED } from '@shell/components/form/ResourceQuota/shared';
import { LabeledInput } from '@components/Form/LabeledInput';

export default {
  components: {
    Row,
    LabeledInput,
  },

  props: {
    mode: {
      type:     String,
      required: true,
    },
    value: {
      type:    Object,
      default: () => {
        return {};
      }
    },
    project: {
      type:     Object,
      required: true
    },
    types: {
      type:    Array,
      default: () => {
        return [];
      }
    }
  },

  data() {
    return {
      rows:    {},
      vmCount: '',
    };
  },

  computed: {
    ...QUOTA_COMPUTED,

    projectResourceQuotaLimits() {
      return this.project?.spec?.resourceQuota?.limit || {};
    },

    namespaceResourceQuotaLimits() {
      return this.project.namespaces.map(namespace => ({
        ...namespace.resourceQuota.limit,
        id: namespace.id
      }));
    },

    editableLimits() {
      return Object.keys(this.projectResourceQuotaLimits);
    },

    defaultResourceQuotaLimits() {
      return this.project.spec.namespaceDefaultResourceQuota.limit;
    },

    hasLimitMemoryRow() {
      return this.editableLimits.includes('limitsMemory');
    },
  },

  methods: {
    update(key, value) {
      const resourceQuota = {
        limit: {
          ...this.value.resourceQuota.limit,
          [key]: value
        }
      };

      this.$set(this.value, 'resourceQuota', resourceQuota);
    },

    updateMaintenance(key, value) {
      const maintenanceQuota = {
        limit: {
          ...this.value.maintenanceQuota.limit,
          [key]: value
        }
      };

      this.$set(this.value, 'maintenanceQuota', maintenanceQuota);
    },

    updateAvailableQuota(key, value) {
      this.$emit('updateAvailableQuota', key, value);
    },
  },
};
</script>
<template>
  <div>
    <div
      class="row"
    >
      <div class="col span-6">
        <LabeledInput
          v-model.number="value.vmCount"
          :mode="mode"
          :label="t('harvester.resourceQuota.vmCount.label')"
          :disabled="!hasLimitMemoryRow"
          :tooltip="t('harvester.resourceQuota.vmCount.toolTip')"
          :hover-tooltip="true"
          required
        />
      </div>
    </div>
    <div class="headers mb-10 mt-20">
      <div class="mr-10">
        <label>
          {{ t('resourceQuota.headers.resourceType') }}
        </label>
      </div>
      <div class="mr-10">
        <label>
          {{ t('resourceQuota.headers.projectResourceAvailability') }}
        </label>
      </div>
      <div class="mr-10">
        <label>
          {{ t('harvester.resourceQuota.requestLimit.label') }}
        </label>
        <i
          v-tooltip="t('harvester.resourceQuota.requestLimit.toolTip')"
          class="icon icon-info ml-5"
        />
      </div>
      <div class="mr-10">
        <label>
          {{ t('harvester.resourceQuota.actualLimit.label') }}
        </label>
        <i
          v-tooltip="t('harvester.resourceQuota.actualLimit.toolTip')"
          class="icon icon-info ml-5"
        />
      </div>
      <div class="mr-20">
        <label>
          {{ t('harvester.resourceQuota.reserveMaintenanceResources.label') }}
        </label>
      </div>
    </div>
    <Row
      v-for="(limit, i) in editableLimits"
      :key="project.id + i"
      :value="value.resourceQuota"
      :namespace="value"
      :mode="mode"
      :types="mappedTypes"
      :type="limit"
      :project-resource-quota-limits="projectResourceQuotaLimits"
      :default-resource-quota-limits="defaultResourceQuotaLimits"
      :namespace-resource-quota-limits="namespaceResourceQuotaLimits"
      :has-limit-memory-row="hasLimitMemoryRow"
      :vm-count="value.vmCount"
      :maintenance-quota="value.maintenanceQuota"
      @updateMaintenance="updateMaintenance"
      @input="update"
      @updateAvailableQuota="updateAvailableQuota"
    />
  </div>
</template>
<style lang="scss" scoped>
.headers {
    display: flex;
    flex-direction: row;
    justify-content: space-evenly;
    align-items: center;
    border-bottom: 1px solid var(--border);
    height: 30px;

    div {
        width: 100%;
    }
}

.row:not(:last-of-type) {
  margin-bottom: 10px;
}
</style>
