<script>
import { PRODUCT_NAME as HARVESTER_PRODUCT } from '../config/harvester';
import { HCI } from '../types';

export default {
  name: 'HarvesterVFAddress',

  props: {
    row: {
      type:     Object,
      required: true
    },
  },

  data() {
    return { showAll: false, limitedNumbers: 3 };
  },

  computed: {
    allVFs() {
      return this.row.status?.vfAddresses || [];
    },

    rows() {
      const out = this.allVFs.map((O) => {
        const [prefix, middle, suffix] = O.split(':');
        const q = `${ this.row.spec?.nodeName }-${ prefix }${ middle }${ suffix.replace('.', '') }`;
        const to = {
          name:   `${ HARVESTER_PRODUCT }-c-cluster-resource`,
          params: { cluster: this.$store.getters['clusterId'], resource: HCI.PCI_DEVICE },
          query:  { q }
        };

        return {
          to,
          name: O
        };
      });

      return {
        visible:   out.slice(0, this.limitedNumbers),
        invisible: out.slice(this.limitedNumbers)
      };
    },
  }
};
</script>

<template>
  <div class="vfs">
    <span v-for="(vf, index) in rows.visible" :key="vf.name">
      <n-link
        :to="vf.to"
      >
        {{ vf.name }}
      </n-link>

      <span v-if="index < rows.visible.length - 1">, </span>
    </span>

    <v-popover
      trigger="click"
      placement="top"
    >
      <span v-if="allVFs.length > limitedNumbers">
        , <a
          href="javascript:void(0)"
          class="show-more"
          @click.prevent="showAll = !showAll"
        >
          {{ t('harvester.sriov.showMore') }}
        </a>
      </span>

      <template v-slot:popover>
        <div class="vfs-popup">
          <div>
            <span v-for="(vf, index) in rows.invisible" :key="vf.name">
              <n-link
                :to="vf.to"
              >
                {{ vf.name }}
              </n-link>

              <span v-if="index < rows.invisible.length - 1">, </span>
            </span>
          </div>
        </div>
      </template>
    </v-popover>
  </div>
</template>

<style lang="scss" scoped>

  .vfs {
    min-width: 380px;

    .show-more {
      font-size: 12px;
    }
  }
  .popover .popover-inner .vfs-popup a {
    color: var(--link);

    &:hover {
      text-decoration: underline;
      color: var(--body-text);
    }
  }
</style>
