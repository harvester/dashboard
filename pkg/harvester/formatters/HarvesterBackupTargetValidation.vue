<script>
import { HCI } from '../types';

export default {
  props: {
    value: {
      type:    String,
      default: ''
    }
  },

  async fetch() {
    const harvesterSettings = await this.$store.dispatch('harvester/findAll', { type: HCI.SETTING });

    this.harvesterSettings = harvesterSettings;
  },

  data() {
    return { harvesterSettings: [] };
  },

  computed: {
    isMatch() {
      const harvesterSettings = this.$store.getters['harvester/all'](HCI.SETTING) || [];
      const resource = harvesterSettings.find( V => V.id === 'backup-target');

      let isMatch = false;

      try {
        isMatch = this.value === resource?.parseValue?.endpoint;
      } catch (e) {}

      return isMatch;
    }
  }
};
</script>

<template>
  <div v-if="isMatch">
    {{ value }}
  </div>
  <div v-else>
    {{ value }}
    <p v-if="value" class="text-error">
      {{ t('harvester.backup.matchTarget') }}
    </p>
  </div>
</template>
