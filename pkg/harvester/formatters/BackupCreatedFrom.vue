<script>
import { HCI } from '../types';

export default {
  props: {
    value: {
      type:    String,
      default: ''
    },
  },
  data() {
    const scheduleList = this.$store.getters['harvester/all'](HCI.SCHEDULE_VM_BACKUP) || [];

    return { scheduleList };
  },
  computed: {
    vmSchedule() {
      if (!this.value) {
        return '';
      } else {
        return this.scheduleList.find(s => s.id === this.value);
      }
    },
    to() {
      return this.vmSchedule?.detailLocation;
    },
  }
};
</script>

<template>
  <n-link v-if="to" :to="to">
    {{ value }}
  </n-link>
  <span v-else-if="value">
    {{ value }}
  </span>
  <span v-else class="text-muted">
    &mdash;
  </span>
</template>
