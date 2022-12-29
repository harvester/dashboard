<script>
import { NODE } from '@shell/config/types';
import { HCI } from '../types';
import CopyToClipboard from '@shell/components/CopyToClipboard';

export default {
  components: { CopyToClipboard },
  props:      {
    value: {
      type:    String,
      default: ''
    },
    row: {
      type:     Object,
      required: true
    }
  },

  computed: {
    nodeName() {
      return this.node?.nameDisplay || '';
    },

    vmi() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const vmiResources = this.$store.getters[`${ inStore }/all`](HCI.VMI);
      const resource = vmiResources.find(VMI => VMI.id === this.row.id) || null;

      return resource;
    },

    node() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const nodeName = this.vmi?.status?.nodeName;

      return this.$store.getters[`${ inStore }/byId`](NODE, nodeName);
    },
  },
};
</script>

<template>
  <div>
    {{ nodeName }}
    <CopyToClipboard
      :text="nodeName"
      label-as="tooltip"
      class="icon-btn"
      action-color="bg-transparent"
    />
  </div>
</template>
