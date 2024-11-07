<script>
import { findBy } from '@shell/utils/array';
import UnitInput from '@shell/components/form/UnitInput';
import { LabeledInput } from '@components/Form/LabeledInput';
import LabelValue from '@shell/components/LabelValue';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import InputOrDisplay from '@shell/components/InputOrDisplay';
import { Banner } from '@components/Banner';
import { PVC } from '@shell/config/types';
import { HCI } from '../../../../types';
import { formatSi, parseSi } from '@shell/utils/units';
import { VOLUME_TYPE, InterfaceOption } from '../../../../config/harvester-map';
import { _VIEW } from '@shell/config/query-params';
import { ucFirst } from '@shell/utils/string';

export default {
  name: 'HarvesterEditVMImage',

  components: {
    UnitInput, LabeledInput, LabeledSelect, InputOrDisplay, LabelValue, Banner
  },

  props: {
    value: {
      type:    Object,
      default: () => {
        return {};
      }
    },

    namespace: {
      type:    String,
      default: null
    },

    mode: {
      type:    String,
      default: 'create'
    },

    idx: {
      type:     Number,
      required: true
    },

    isCreate: {
      type:    Boolean,
      default: true
    },
    isEdit: {
      type:    Boolean,
      default: false
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
      images:  [],
    };
  },

  fetch() {
    this.images = this.$store.getters['harvester/all'](HCI.IMAGE);
  },

  computed: {
    encryptionValue() {
      return ucFirst(String(this.value.isEncrypted));
    },

    isView() {
      return this.mode === _VIEW;
    },

    imagesOption() {
      return this.images.filter(c => c.isReady).sort((a, b) => a.creationTimestamp > b.creationTimestamp ? -1 : 1).map( (I) => {
        return {
          label: `${ I.metadata.namespace }/${ I.spec.displayName }`,
          value: I.id
        };
      });
    },

    imageName() {
      const image = this.imagesOption.find(I => I.value === this.value.image);

      return image ? image.label : '-';
    },

    readyToUse() {
      const val = String(this.value.volumeBackups?.readyToUse || false);

      return ucFirst(val);
    },

    pvcsResource() {
      const allPVCs = this.$store.getters['harvester/all'](PVC) || [];

      return allPVCs.find((P) => {
        return this.namespace ? P.id === `${ this.namespace }/${ this.value.volumeName }` : true;
      });
    },

    isLonghornV2() {
      return this.value.pvc?.isLonghornV2 || this.value.pvc?.storageClass?.isLonghornV2;
    }
  },

  watch: {
    'value.type'(neu) {
      if (neu === 'cd-rom') {
        this.$set(this.value, 'bus', 'sata');
        this.update();
      }
    },

    'value.image'(neu) {
      this.checkImageExists(neu);
    },

    imagesOption() {
      this.checkImageExists(this.value.image);
    },

    pvcsResource: {
      handler(pvc) {
        if (pvc?.spec?.resources?.requests?.storage && this.isVirtualType) {
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
    update() {
      this.$emit('update');
    },

    onImageChange() {
      const imageResource = this.$store.getters['harvester/all'](HCI.IMAGE)?.find( I => this.value.image === I.id);
      const isIsoImage = /iso$/i.test(imageResource?.imageSuffix);
      const imageSize = Math.max(imageResource?.status?.size, imageResource?.status?.virtualSize);

      if (isIsoImage) {
        this.$set(this.value, 'type', 'cd-rom');
        this.$set(this.value, 'bus', 'sata');
      } else {
        this.$set(this.value, 'type', 'disk');
        this.$set(this.value, 'bus', 'virtio');
      }

      if (imageSize) {
        let imageSizeGiB = Math.ceil(imageSize / 1024 / 1024 / 1024);

        if (!isIsoImage) {
          imageSizeGiB = Math.max(imageSizeGiB, 10);
        }
        this.$set(this.value, 'size', `${ imageSizeGiB }Gi`);
      }

      this.update();
    },

    onOpen() {
      this.images = this.$store.getters['harvester/all'](HCI.IMAGE);
    },

    checkImageExists(imageId) {
      if (!!imageId && this.imagesOption.length > 0 && !findBy(this.imagesOption, 'value', imageId)) {
        this.$store.dispatch('growl/error', {
          title:   this.$store.getters['i18n/t']('harvester.vmTemplate.tips.notExistImage.title', { name: imageId }),
          message: this.$store.getters['i18n/t']('harvester.vmTemplate.tips.notExistImage.message')
        }, { root: true });

        this.$set(this.value, 'image', '');
      }
    }
  }
};
</script>

<template>
  <div>
    <div class="row mb-20">
      <div
        data-testid="input-hevi-name"
        class="col span-6"
      >
        <InputOrDisplay :name="t('harvester.fields.name')" :value="value.name" :mode="mode">
          <LabeledInput
            v-model="value.name"
            :label="t('harvester.fields.name')"
            required
            :mode="mode"
            @input="update"
          />
        </InputOrDisplay>
      </div>

      <div
        data-testid="input-hevi-type"
        class="col span-6"
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
            :mode="mode"
            @input="update"
          />
        </InputOrDisplay>
      </div>
    </div>

    <div class="row mb-20">
      <div
        data-testid="input-hevi-image"
        class="col span-6"
      >
        <InputOrDisplay
          :name="t('harvester.fields.image')"
          :value="imageName"
          :mode="mode"
        >
          <LabeledSelect
            v-model="value.image"
            :disabled="idx === 0 && !isCreate && !value.newCreateId && isVirtualType"
            :label="t('harvester.fields.image')"
            :options="imagesOption"
            :mode="mode"
            :searchable="true"
            :required="validateRequired"
            @input="onImageChange"
          />
        </InputOrDisplay>
      </div>

      <div
        data-testid="input-hevi-size"
        class="col span-6"
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
            :label="t('harvester.fields.size')"
            :mode="mode"
            :required="validateRequired"
            :disable="isLonghornV2"
            suffix="GiB"
            @input="update"
          />
        </InputOrDisplay>
      </div>
    </div>

    <div class="row mb-20">
      <div
        data-testid="input-hevi-bus"
        class="col span-6"
      >
        <InputOrDisplay
          :name="t('harvester.virtualMachine.volume.bus')"
          :value="value.bus"
          :mode="mode"
        >
          <LabeledSelect
            v-model="value.bus"
            :label="t('harvester.virtualMachine.volume.bus')"
            :mode="mode"
            :options="InterfaceOption"
            @input="update"
          />
        </InputOrDisplay>
      </div>
      <div
        v-if="isView"
        class="col span-3"
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
    <Banner
      v-if="value.volumeBackups && value.volumeBackups.error && value.volumeBackups.error.message"
      color="error"
      class="mb-20"
      :label="value.volumeBackups.error.message"
    />
  </div>
</template>
