<script>
import cronstrue from 'cronstrue';

export default {
  props: {
    value: {
      type:    String,
      default: ''
    },
  },
  computed: {
    cronTooltipHint() {
      let cronHint = '';

      try {
        cronHint = cronstrue.toString(this.value, { verbose: true });
      } catch (e) {
        cronHint = this.t('generic.invalidCron');
      }

      return cronHint || this.value.spec.cron;
    }

  }
};
</script>

<template>
  <span v-clean-tooltip="cronTooltipHint">
    {{ value }}
  </span>
</template>
