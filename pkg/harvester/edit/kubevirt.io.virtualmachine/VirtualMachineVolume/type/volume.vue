<script>
import Loading from '@shell/components/Loading';
import UnitInput from '@shell/components/form/UnitInput';
import InputOrDisplay from '@shell/components/InputOrDisplay';
import { LabeledInput } from '@components/Form/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { PVC, STORAGE_CLASS } from '@shell/config/types';
import { formatSi, parseSi } from '@shell/utils/units';
import { VOLUME_TYPE, InterfaceOption } from '../../../../config/harvester-map';
import { _VIEW } from '@shell/config/query-params';
import LabelValue from '@shell/components/LabelValue';
import { ucFirst } from '@shell/utils/string';
import { LVM_DRIVER } from '../../../../models/harvester/storage.k8s.io.storageclass';
import { DATA_ENGINE_V2 } from '../../../../models/harvester/persistentvolumeclaim';

export default {
  name:       'HarvesterEditVolume',
  components: {
    InputOrDisplay, Loading, LabeledInput, LabeledSelect, UnitInput, LabelValue
  },

  props: {
    mode: {
      type:    String,
      default: 'create'
    },

    isEdit: {
      type:    Boolean,
      default: false
    },

    namespace: {
      type:    String,
      default: null
    },

    value: {
      type:    Object,
      default: () => {
        return {};
      }
    },

    validateRequired: {
      type:     Boolean,
      required: true
    },

    isVirtualType: {
      type:    Boolean,
      default: true
    }
  },

  data() {
    return {
      VOLUME_TYPE,
      InterfaceOption,
      loading: false,
    };
  },

  computed: {
    encryptionValue() {
      return ucFirst(String(this.value.isEncrypted));
    },

    readyToUse() {
      const val = String(this.value.volumeBackups?.readyToUse || false);

      return ucFirst(val);
    },

    isView() {
      return this.mode === _VIEW;
    },

    pvcsResource() {
      const allPVCs = this.$store.getters['harvester/all'](PVC) || [];

      return allPVCs.find(P => P.id === `${ this.namespace }/${ this.value.volumeName }`);
    },

    isDisabled() {
      return !this.value.newCreateId && this.isEdit && this.isVirtualType;
    },

    storageClasses() {
      return this.$store.getters[`harvester/all`](STORAGE_CLASS) || [];
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

    isLonghornV2() {
      return this.value.pvc?.isLonghornV2 || this.value.pvc?.storageClass?.isLonghornV2;
    }
  },

  watch: {
    'value.storageClassName': {
      immediate: true,
      handler(neu) {
        this.value.accessMode = this.getAccessMode(neu);
      }
    },

    'value.type'(neu) {
      if (neu === 'cd-rom') {
        this.$set(this.value, 'bus', 'sata');
        this.update();
      }
    },

    pvcsResource: {
      handler(pvc) {
        if (pvc?.spec?.resources?.requests?.storage) {
          const parseValue = parseSi(pvc.spec.resources.requests.storage);

          const formatSize = formatSi(parseValue, {
            increment:   1024,
            addSuffix:   false,
            maxExponent: 3,
            minExponent: 3,
          });

          this.value.size = `${ formatSize }Gi`;
        }
      },
      deep:      true,
      immediate: true
    },
  },

  methods: {
    getAccessMode(storageClassName) {
      const storageClass = this.storageClasses.find(sc => sc.name === storageClassName);

      let readWriteOnce = this.value.pvc?.isLvm || this.value.pvc?.isLonghornV2;

      if (storageClass) {
        readWriteOnce = storageClass.provisioner === LVM_DRIVER || storageClass.parameters?.dataEngine === DATA_ENGINE_V2;
      }

      return readWriteOnce ? 'ReadWriteOnce' : 'ReadWriteMany';
    },

    update() {
      this.$emit('update');
    },
  },
};
</script>

<template>
  <div>
    <Loading mode="relative" :loading="loading" />
    <div class="row mb-20">
      <div
        class="col span-6"
        data-testid="input-hev-name"
      >
        <InputOrDisplay
          :name="t('harvester.fields.name')"
          :value="value.name"
          :mode="mode"
        >
          <LabeledInput
            v-model="value.name"
            :label="t('harvester.fields.name')"
            :mode="mode"
            required
            @input="update"
          />
        </InputOrDisplay>
      </div>

      <div
        class="col span-6"
        data-testid="input-hev-type"
      >
        <InputOrDisplay
          :name="t('harvester.fields.type')"
          :value="value.type"
          :mode="mode"
        >
          <LabeledSelect
            v-model="value.type"
            :label="t('harvester.fields.type')"
            :options="VOLUME_TYPE"
            required
            :mode="mode"
            @input="update"
          />
        </InputOrDisplay>
      </div>
    </div>

    <div class="row mb-20">
      <div
        data-testid="input-hav-storage"
        class="col span-6"
      >
        <InputOrDisplay
          :name="t('harvester.storage.storageClass.label')"
          :value="value.storageClassName"
          :mode="mode"
        >
          <LabeledSelect
            v-model="value.storageClassName"
            :options="storageClassOptions"
            :label="t('harvester.storage.storageClass.label')"
            :mode="mode"
            :disabled="isDisabled"
            :required="validateRequired"
            @input="update"
          />
        </InputOrDisplay>
      </div>
      <div
        class="col span-6"
        data-testid="input-hev-size"
      >
        <InputOrDisplay
          :name="t('harvester.fields.size')"
          :value="value.size"
          :mode="mode"
        >
          <UnitInput
            v-model="value.size"
            v-int-number
            :output-modifier="true"
            :increment="1024"
            :input-exponent="3"
            :mode="mode"
            :required="validateRequired"
            :label="t('harvester.fields.size')"
            :disabled="isLonghornV2"
            @input="update"
          />
        </InputOrDisplay>
      </div>
    </div>
    <div class="row mb-20">
      <div
        data-testid="input-hev-bus"
        class="col span-6"
      >
        <InputOrDisplay :name="t('harvester.virtualMachine.volume.bus')" :value="value.bus" :mode="mode">
          <LabeledSelect
            v-model="value.bus"
            :label="t('harvester.virtualMachine.volume.bus')"
            :mode="mode"
            :options="InterfaceOption"
            required
            @input="update"
          />
        </InputOrDisplay>
      </div>
      <div
        v-if="isView"
        class="col span-6"
      >
        <LabelValue
          :name="t('harvester.virtualMachine.volume.encryption')"
          :value="encryptionValue"
        />
      </div>
    </div>
    <div class="row mb-20">
      <div v-if="value.volumeBackups && isView" class="col span-3">
        <LabelValue
          :name="t('harvester.virtualMachine.volume.readyToUse')"
          :value="readyToUse"
        />
      </div>
    </div>
  </div>
</template>
