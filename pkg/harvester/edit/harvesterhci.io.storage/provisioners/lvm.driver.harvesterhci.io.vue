<script>

import KeyValue from '@shell/components/form/KeyValue';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { LabeledInput } from '@components/Form/LabeledInput';
import RadioGroup from '@components/Form/Radio/RadioGroup';

import { allHash } from '@shell/utils/promise';
import { _CREATE, _VIEW } from '@shell/config/query-params';
import { LONGHORN } from '@shell/config/types';
import { clone } from '@shell/utils/object';
import { uniq } from '@shell/utils/array';
import { LONGHORN_VERSION_V1, LONGHORN_VERSION_V2 } from '@shell/models/persistentvolume';
import { HCI } from '../../../types';

const DEFAULT_PARAMETERS = [
  'type',
  'vgName'
];

export default {
  components: {
    KeyValue,
    LabeledSelect,
    LabeledInput,
    RadioGroup,
  },

  props: {
    value: {
      type:     Object,
      required: true
    },
    mode: {
      type:     String,
      required: true
    },
    realMode: {
      type:     String,
      required: true
    },
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;

    await allHash({
      lvmVolumeGroups: this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.LVM_VOLUME_GROUP }),
    });
  },

  data() {
    return {
      volumeGroupTypes: ['striped', 'dm-thin'],
      volumeGroupType: null,
      volumeGroup: null,
      nodeName: 'harvester-node-0'
    };
  },

  computed: {
    volumeGroups() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const lvmVolumeGroups = this.$store.getters[`${ inStore }/all`](HCI.LVM_VOLUME_GROUP) || [];

      return lvmVolumeGroups
        .filter(group => group.spec.nodeName === this.nodeName)
        .map(g => g.spec.vgName);
    },
    parameters: {
      get() {
        const parameters = clone(this.value?.parameters) || {};

        DEFAULT_PARAMETERS.map((key) => {
          delete parameters[key];
        });

        return parameters;
      },

      set(value) {
        Object.assign(this.value.parameters, value);
      }
    },
  },
};
</script>
<template>
  <div>
    <div class="row mt-10">
      <div class="col span-6">
        <LabeledSelect
          v-model="volumeGroup"
          :label="t('harvester.storage.parameters.lvmVolumeGroup.label')"
          :options="volumeGroups"
          :mode="mode"
          :required="true"
        >
          <template #no-options="{ searching }">
            <span v-if="!searching" class="text-muted">
              {{ t('harvester.storage.parameters.diskSelector.no-options', null, true) }}
            </span>
          </template>
        </LabeledSelect>
      </div>
      <div class="col span-6">
        <LabeledSelect
          v-model="volumeGroupType"
          :label="t('harvester.storage.parameters.lvmVolumeGroupType.label')"
          :options="volumeGroupTypes"
          :mode="mode"
          :required="true"
        >
          <template #no-options="{ searching }">
            <span v-if="!searching" class="text-muted">
              {{ t('harvester.storage.parameters.nodeSelector.no-options', null, true) }}
            </span>
          </template>
        </LabeledSelect>
      </div>
    </div>
    <KeyValue
      v-model="parameters"
      :add-label="t('storageClass.longhorn.addLabel')"
      :read-allowed="false"
      :mode="mode"
      class="mt-10"
    />
  </div>
</template>

<style lang="scss" scoped>
.labeled-input.compact-input {
  padding: 7px 10px;
}
</style>

