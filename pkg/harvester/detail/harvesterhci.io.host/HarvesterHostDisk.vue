<script>
import Tag from '@shell/components/Tag';
import LabelValue from '@shell/components/LabelValue';
import { BadgeState } from '@components/BadgeState';
import { Banner } from '@components/Banner';
import HarvesterDisk from '../../mixins/harvester-disk';
import { RadioGroup } from '@components/Form/Radio';

import { LONGHORN_VERSION_V1 } from '@shell/models/persistentvolume';

export default {
  components: {
    LabelValue,
    BadgeState,
    Banner,
    Tag,
    RadioGroup
  },

  mixins: [
    HarvesterDisk,
  ],

  props: {
    value: {
      type:    Object,
      default: () => {
        return {};
      },
    },
    disks: {
      type:    Array,
      default: () => [],
    },
    mode: {
      type:    String,
      default: 'edit',
    },
  },
  data() {
    return {};
  },
  computed: {
    targetDisk() {
      return this.disks.find(disk => disk.name === this.value.name);
    },
    schedulableTooltipMessage() {
      const { name, path } = this.value;

      if (this.targetDisk && !this.targetDisk.allowScheduling && name && path) {
        return this.t('harvester.host.disk.allowScheduling.tooltip', { name, path });
      } else {
        return this.schedulableCondition.message;
      }
    },
    allowSchedulingOptions() {
      return [{
        label: this.t('generic.enabled'),
        value: true,
      }, {
        label: this.t('generic.disabled'),
        value: false,
      }];
    },

    evictionRequestedOptions() {
      return [{
        label: this.t('generic.yes'),
        value: true,
      }, {
        label: this.t('generic.no'),
        value: false,
      }];
    },

    provisionPhase() {
      return this.value?.blockDevice?.provisionPhase || {};
    },

    mountedMessage() {
      const state = this.value?.blockDevice?.metadata?.state || {};

      if (state?.error) {
        return state?.message;
      } else {
        return '';
      }
    },

    provisioner() {
      let labelKey = `harvester.host.disk.storage.longhorn.${ LONGHORN_VERSION_V1 }.label`;

      if (this.value?.blockDevice?.spec?.provisioner.longhorn) {
        labelKey = `harvester.host.disk.storage.longhorn.${ this.value.blockDevice.spec.provisioner.longhorn.engineVersion }.label`;
      }

      if (this.value?.blockDevice?.spec?.provisioner.lvm) {
        labelKey = 'harvester.host.disk.storage.lvm.label';
      }

      return this.t(labelKey);
    }
  },
  methods: {
    update() {
      this.$emit('input', this.value);
    },

    canEditPath(value) {
      if (this.mountedMessage) {
        return true;
      }

      if (value.isNew && !!value.originPath) {
        return true;
      }

      return false;
    },
  },
};
</script>

<template>
  <div class="disk" @input="update">
    <Banner
      v-if="mountedMessage"
      color="error"
      :label="mountedMessage"
    />
    <div v-if="!value.isNew">
      <div class="row">
        <div class="col span-12">
          <LabelValue
            v-if="value.tags.length"
            :name="t('harvester.host.disk.tags.label')"
          >
            <template #value>
              <div class="mt-5">
                <Tag v-for="(prop, key) in value.tags" :key="key + prop" class="mr-5">
                  {{ prop }}
                </Tag>
              </div>
            </template>
          </LabelValue>
        </div>
      </div>
      <div class="row mt-10">
        <div class="col span-12">
          <div class="pull-left">
            <RadioGroup
              v-model="value.allowScheduling"
              name="diskScheduling"
              :label="t('harvester.host.disk.allowScheduling.label')"
              :mode="mode"
              :options="allowSchedulingOptions"
              :row="true"
            />
          </div>
          <div class="pull-right">
            {{ t('harvester.host.disk.conditions') }}:
            <BadgeState
              v-clean-tooltip="readyCondition.message"
              :color="readyCondition.status === 'True' ? 'bg-success' : 'bg-error' "
              :icon="readyCondition.status === 'True' ? 'icon-checkmark' : 'icon-warning' "
              label="Ready"
              class="mr-10 ml-10 state"
            />
            <BadgeState
              v-clean-tooltip="schedulableTooltipMessage"
              :color="schedulableCondition.status === 'True' && targetDisk?.allowScheduling ? 'bg-success' : 'bg-error' "
              :icon="schedulableCondition.status === 'True' && targetDisk?.allowScheduling ? 'icon-checkmark' : 'icon-warning' "
              label="Schedulable"
              class="mr-10 state"
            />
            <BadgeState
              v-if="provisionPhase.label"
              :color="provisionPhase.color"
              :icon="provisionPhase.icon"
              :label="provisionPhase.label"
              class="mr-10 state"
            />
          </div>
        </div>
      </div>
      <div v-if="!value.isNew" class="row mt-30">
        <div class="col span-4">
          <LabelValue
            :name="t('harvester.host.disk.storageAvailable.label')"
            :value="value.storageAvailable"
          />
        </div>
        <div class="col span-4">
          <LabelValue
            :name="t('harvester.host.disk.storageScheduled.label')"
            :value="value.storageScheduled"
          />
        </div>
        <div class="col span-4">
          <LabelValue
            :name="t('harvester.host.disk.storageMaximum.label')"
            :value="value.storageMaximum"
          />
        </div>
      </div>
      <hr class="mt-10" />
    </div>
    <div class="row mt-10">
      <div class="col span-4">
        <LabelValue
          :name="t('generic.name')"
          :value="value.displayName"
        />
      </div>
      <div v-if="value.path" class="col span-4">
        <LabelValue
          :name="t('harvester.host.disk.path.label')"
          :value="value.path"
        />
      </div>
      <div class="col span-4">
        <LabelValue
          :name="t('harvester.host.disk.provisioner')"
          :value="provisioner"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.close {
  top: 10px;
  right: 10px;
  padding:0;
  position: absolute;
}

.disk {
  position: relative;

  .secret-name {
    height: $input-height;
  }

  &:not(:last-of-type) {
    padding-bottom: 10px;
    margin-bottom: 30px;
  }
}

.flex {
  display: flex;
  justify-content: space-between;
}

.badge-state {
    padding: 2px 5px;
}
</style>
