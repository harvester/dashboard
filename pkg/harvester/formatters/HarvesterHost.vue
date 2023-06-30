<script>
import { NODE } from '@shell/config/types';
import CopyToClipboardText from '@shell/components/CopyToClipboardText';

export default {
  components: { CopyToClipboardText },
  props:      {
    value: {
      type:    String,
      default: ''
    },
  },

  computed: {
    node() {
      const inStore = this.$store.getters['currentProduct'].inStore;

      return this.$store.getters[`${ inStore }/byId`](NODE, this.value);
    },

    ip() {
      return this.node?.internalIp;
    },

    nameDisplay() {
      return this.node?.nameDisplay || '';
    }
  },
};
</script>

<template>
  <div>
    <CopyToClipboardText v-clean-tooltip="ip" :text="nameDisplay" />
  </div>
</template>
