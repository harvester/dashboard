<script>
import CopyToClipboardText from '@shell/components/CopyToClipboardText';
import LabelValue from '@shell/components/LabelValue';
import { DESCRIPTION } from '@shell/config/labels-annotations';
import { HCI as HCI_ANNOTATIONS } from '@pkg/harvester/config/labels-annotations';
import { HCI } from '../../types';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import { findBy } from '@shell/utils/array';
import { get } from '@shell/utils/object';
import { ucFirst } from '@shell/utils/string';
import Storage from './Storage';
import { SECRET } from '@shell/config/types';

export default {
  components: {
    CopyToClipboardText,
    Tab,
    Tabbed,
    LabelValue,
    Storage,
  },

  props: {
    value: {
      type:     Object,
      required: true,
    },
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;

    this.secrets = await this.$store.dispatch(`${ inStore }/findAll`, { type: SECRET });
    this.images = await this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.IMAGE });
  },

  data() {
    return {
      secrets: [],
      images:  []
    };
  },

  computed: {
    formattedValue() {
      return this.value?.downSize;
    },

    virtualSize() {
      return this.value?.virtualSize;
    },

    url() {
      return this.value?.spec?.url || '-';
    },

    description() {
      return this.value?.metadata?.annotations?.[DESCRIPTION] || '-';
    },

    errorMessage() {
      const conditions = get(this.value, 'status.conditions');

      return findBy(conditions, 'type', 'Imported')?.message || '-';
    },

    isUpload() {
      return this.value?.spec?.sourceType === 'upload';
    },

    sourceImage() {
      const { sourceImageName, sourceImageNamespace } = this.value?.spec?.securityParameters || {};

      if (sourceImageNamespace && sourceImageName) {
        const imageId = `${ sourceImageNamespace }/${ sourceImageName }`;

        return this.images.find(image => image.id === imageId);
      }

      return null;
    },

    sourceImageLink() {
      return this.sourceImage?.detailLocation;
    },

    sourceImageId() {
      if (this.sourceImage) {
        return this.sourceImage.displayNameWithNamespace;
      }

      return '';
    },

    isEncryptedOrDecrypted() {
      return ['encrypt', 'decrypt'].includes(this.value?.spec?.securityParameters?.cryptoOperation);
    },

    encryptionSecret() {
      if (!this.value.isEncrypted) {
        return '-';
      }

      return this.value.encryptionSecret;
    },
    secretLink() {
      return this.secrets.find(sc => sc.id === this.value.encryptionSecret)?.detailLocation;
    },

    isEncryptedString() {
      return ucFirst(String(this.value.isEncrypted));
    },

    imageName() {
      return this.value?.metadata?.annotations?.[HCI_ANNOTATIONS.IMAGE_NAME] || '-';
    },
  }
};
</script>

<template>
  <Tabbed v-bind="$attrs" class="mt-15" :side-tabs="true">
    <Tab
      name="detail"
      :label="t('harvester.virtualMachine.detail.tabs.basics')"
      class="bordered-table"
      :weight="99"
    >
      <div class="row">
        <div class="col span-12">
          <LabelValue
            v-if="isUpload"
            :name="t('harvester.image.fileName')"
            :value="imageName"
            class="mb-20"
          />
          <LabelValue
            v-else
            :name="t('harvester.image.url')"
            :value="url"
            class="mb-20"
          >
            <template #value>
              <div v-if="url !== '-'">
                <CopyToClipboardText :text="url" />
              </div>
              <div v-else>
                {{ url }}
              </div>
            </template>
          </LabelValue>
        </div>
      </div>

      <div class="row">
        <div class="col span-12">
          <LabelValue :name="t('harvester.image.size')" :value="formattedValue" class="mb-20" />
        </div>
      </div>

      <div class="row">
        <div class="col span-12">
          <LabelValue :name="t('harvester.image.virtualSize')" :value="virtualSize" class="mb-20" />
        </div>
      </div>

      <div class="row">
        <div class="col span-12">
          <LabelValue :name="t('nameNsDescription.description.label')" :value="description" class="mb-20" />
        </div>
      </div>

      <div class="row">
        <div class="col span-12">
          <LabelValue :name="t('harvester.image.isEncryption')" :value="isEncryptedString" class="mb-20" />
        </div>
      </div>

      <div v-if="value.isEncrypted" class="row mb-20">
        <div class="col span-12">
          <div class="text-label">
            {{ t('harvester.image.encryptionSecret') }}
          </div>
          <n-link v-if="encryptionSecret && secretLink" :to="secretLink">
            {{ encryptionSecret }}
          </n-link>
          <span v-else-if="encryptionSecret">
            {{ encryptionSecret }}
          </span>
          <span v-else class="text-muted">
            &mdash;
          </span>
        </div>
      </div>

      <div v-if="isEncryptedOrDecrypted" class="row mb-20">
        <div class="col span-12">
          <div class="text-label">
            {{ t('harvester.image.sourceImage') }}
          </div>
          <n-link v-if="sourceImageId && sourceImageLink" :to="sourceImageLink">
            {{ sourceImageId }}
          </n-link>
          <span v-else-if="sourceImageId">
            {{ sourceImageId }}
          </span>
          <span v-else class="text-muted">
            &mdash;
          </span>
        </div>
      </div>

      <div v-if="errorMessage !== '-'" class="row">
        <div class="col span-12">
          <div>
            {{ t('tableHeaders.message') }}
          </div>
          <div :class="{ 'error': errorMessage !== '-' }">
            {{ errorMessage }}
          </div>
        </div>
      </div>
    </Tab>
    <Tab
      name="storage"
      :label="t('harvester.storage.label')"
      :weight="89"
      class="bordered-table"
    >
      <Storage
        v-model="value.spec.storageClassParameters"
      />
    </Tab>
  </Tabbed>
</template>

<style lang="scss" scoped>
.error {
  color: var(--error);
}
</style>
