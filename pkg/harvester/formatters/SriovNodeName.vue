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

  data() {
    return { inStore: 'harvester' };
  },

  created() {
    const inStore = this.$store.getters['currentProduct'].inStore;

    this.inStore = inStore;
  },

  computed: {
    nodeName() {
      return this.node?.nameDisplay || '';
    },

    device() {
      const resources = this.$store.getters[`${ this.inStore }/all`](HCI.SR_IOV);
      const resource = resources.find(R => R.id === this.row.id) || null;

      return resource;
    },

    node() {
      const nodeName = this.device.spec.nodeName;
      const nodes = this.$store.getters[`${ this.inStore }/all`](NODE);

      return nodes.find(N => N.id === nodeName);
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
