<script>
import { RadioGroup } from '@components/Form/Radio';
import LabelValue from '@shell/components/LabelValue';
import { Banner } from '@components/Banner';

export default {
  name: 'HarvesterSeeder',

  components: {
    RadioGroup,
    LabelValue,
    Banner,
  },

  props: {
    mode: {
      type:     String,
      required: true
    },

    node: {
      type:     Object,
      required: true,
    },

    inventory: {
      type:     Object,
      required: true,
    },
  },

  data() {
    const enableInventory = !!this.inventory?.id;

    return {
      enableInventory,
      value: this.inventory,
    };
  },

  computed: {
    selectedSecret() {
      const namespace = this.value.spec?.baseboardSpec?.connection?.authSecretRef?.namespace;
      const name = this.value?.spec?.baseboardSpec?.connection?.authSecretRef?.name;

      if (namespace && name) {
        return `${ namespace }/${ name }`;
      } else {
        return 'N/A';
      }
    },
  },
};
</script>

<template>
  <div>
    <div v-if="inventory.warningMessages.length > 0">
      <Banner
        v-for="msg in inventory.warningMessages"
        :key="msg.text"
        color="error"
        :label="msg.text"
      />
    </div>
    <div v-if="enableInventory">
      <div class="row mb-20">
        <div class="col span-6">
          <LabelValue
            :name="t('harvester.seeder.inventory.host.label')"
            :value="value.spec.baseboardSpec.connection.host"
          />
        </div>
        <div class="col span-6">
          <LabelValue
            :name="t('harvester.seeder.inventory.port.label')"
            :value="value.spec.baseboardSpec.connection.port"
          />
        </div>
      </div>
      <div class="row">
        <div class="col span-6">
          <LabelValue
            :name="t('harvester.seeder.inventory.insecureTLS.label')"
            :value="value.spec.baseboardSpec.connection.insecureTLS ? t('generic.yes') : t('generic.no')"
          />
        </div>
        <div class="col span-6">
          <LabelValue
            :name="t('harvester.seeder.inventory.secret.label')"
            :value="selectedSecret"
          />
        </div>
      </div>

      <div class="row mt-20">
        <div class="col span-6">
          <LabelValue
            :name="t('harvester.seeder.inventory.event.label')"
            :value="value.spec.events.enabled ? t('generic.enabled') : t('generic.disabled')"
          />
        </div>
        <div
          v-if="value.spec.events.enabled"
          class="col span-6"
        >
          <LabelValue
            :name="t('harvester.seeder.inventory.pollingInterval.label')"
            :value="value.spec.events.pollingInterval"
          />
        </div>
      </div>
    </div>
    <div
      v-else
      class="row"
    >
      <div class="col span-6">
        <RadioGroup
          v-model="enableInventory"
          :options="[
            { label: t('generic.enabled'), value: true },
            { label: t('generic.disabled'), value: false }
          ]"
          :mode="mode"
          name="enableInventory"
        />
      </div>
    </div>
  </div>
</template>
