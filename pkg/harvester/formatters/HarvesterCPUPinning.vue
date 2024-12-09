<script>

export default {
  name:  'HarvesterCPUPinningFormatter',
  props: {
    value: {
      type:    String, // id
      default: '',
    },
    rows: {
      type:     Array,
      required: true,
    },
  },
  computed: {
    row() {
      return this.rows.find(r => r.id === this.value);
    },
    cpuManagerStatus() {
      if (this.row?.isCPUManagerEnableInProgress) {
        return this.t('generic.loading');
      }

      return this.row?.isCPUManagerEnabled ? this.t('generic.enabled') : this.t('generic.disabled');
    },
  }
};
</script>

<template>
  <span v-if="row?.isCPUManagerEnableInProgress" v-clean-tooltip="cpuManagerStatus">
    <i class="icon icon-spinner icon-spin" />
  </span>
  <span v-else-if="row?.isCPUManagerEnabled" v-clean-tooltip="cpuManagerStatus">
    <i class="icon icon-checkmark" />
  </span>
  <span
    v-else
    v-clean-tooltip="cpuManagerStatus"
    class="text-muted"
  >
    &mdash;
  </span>
</template>
