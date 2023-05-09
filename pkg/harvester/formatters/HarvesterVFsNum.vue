<script>
import { PRODUCT_NAME as HARVESTER_PRODUCT } from '../config/harvester';
import { HCI } from '../types';

export default {
  name: 'HarvesterVFsNum',

  props: {
    row: {
      type:     Object,
      required: true
    },
  },

  computed: {
    to() {
      return {
        name:   `${ HARVESTER_PRODUCT }-c-cluster-resource`,
        params: { cluster: this.$store.getters['clusterId'], resource: HCI.PCI_DEVICE },
        query:  { parentSriov: this.row.id }
      };
    }
  }
};
</script>

<template>
  <div class="vfs-num">
    <n-link
      :to="to"
    >
      {{ row.spec.numVFs }}
    </n-link>
  </div>
</template>
