<script>
import debounce from 'lodash/debounce';
import { _EDIT, _VIEW } from '@shell/config/query-params';
import { removeAt } from '@shell/utils/array';

export default {
  props: {
    value: {
      type:    Array,
      default: null,
    },
    mode: {
      type:    String,
      default: _EDIT,
    },
    specType: {
      type:    String,
      default: 'ClusterIP',
    },
    autoAddIfEmpty: {
      type:    Boolean,
      default: true,
    }
  },

  data() {
    const rows = (this.value || []).map((row) => {
      let type = 'cidr';

      if (row.rangeStart && row.rangeEnd) {
        type = 'range';
      }

      return {
        ...row,
        type,
      };
    });

    return { rows };
  },

  computed: {
    isView() {
      return this.mode === _VIEW;
    },

    showAdd() {
      return !this.isView;
    },

    showRemove() {
      return !this.isView;
    },
  },

  created() {
    this.queueUpdate = debounce(this.update, 500);
  },

  methods: {
    addCIDR() {
      this.rows.push({
        subnet:  '',
        gateway: '',
        type:    'cidr',
      });

      this.queueUpdate();
    },

    addRange() {
      this.rows.push({
        subnet:     '',
        gateway:    '',
        rangeStart: '',
        rangeEnd:   '',
        type:       'range',
      });

      this.queueUpdate();
    },

    remove(idx) {
      removeAt(this.rows, idx);
      this.queueUpdate();
    },

    update() {
      if ( this.isView ) {
        return;
      }

      this.$emit('input', this.rows);
    }
  },
};
</script>

<template>
  <div>
    <div v-if="rows.length">
      <div
        v-for="(row, idx) in rows"
        :key="idx"
      >
        <div
          class="pool-headers"
          :class="{
            [row.type]: true,
          }"
        >
          <span class="pool-subnet">
            <t k="harvester.ipPool.subnet.label" />
            <span class="text-error">
              *
            </span>
          </span>
          <span
            class="pool-gateway"
          >
            <t k="harvester.ipPool.gateway.label" />
          </span>
          <span
            v-if="row.type === 'range'"
            class="pool-startIP"
          >
            <t k="harvester.ipPool.startIP.label" />
          </span>
          <span
            v-if="row.type === 'range'"
            class="pool-endIP"
          >
            <t k="harvester.ipPool.endIP.label" />
          </span>
          <span
            v-if="showRemove"
            class="remove"
          />
        </div>
        <div
          class="pool-row"
          :class="{
            [row.type]: true,
          }"
        >
          <div class="pool-subnet">
            <span v-if="isView">
              {{ row.subnet }}
            </span>
            <input
              v-else
              v-model="row.subnet"
              type="text"
              @input="queueUpdate"
            />
          </div>
          <div
            class="pool-gateway"
          >
            <span v-if="isView">
              {{ row.gateway }}
            </span>
            <input
              v-else
              v-model="row.gateway"
              type="text"
              @input="queueUpdate"
            />
          </div>
          <div
            v-if="row.type === 'range'"
            class="pool-startIP"
          >
            <span v-if="isView">
              {{ row.rangeStart }}
            </span>
            <input
              v-else
              v-model="row.rangeStart"
              type="text"
              @input="queueUpdate"
            />
          </div>
          <div
            v-if="row.type === 'range'"
            class="pool-endIP"
          >
            <span v-if="isView">
              {{ row.rangeEnd }}
            </span>
            <input
              v-else
              v-model="row.rangeEnd"
              type="text"
              @input="queueUpdate"
            />
          </div>
          <div v-if="showRemove" class="remove">
            <button type="button" class="btn role-link" @click="remove(idx)">
              <t k="generic.remove" />
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showAdd" class="footer">
      <button type="button" class="btn role-tertiary add" @click="addCIDR()">
        <t k="harvester.ipPool.cidr.addLabel" />
      </button>
      <button type="button" class="btn role-tertiary add" @click="addRange()">
        <t k="harvester.ipPool.range.addLabel" />
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .pool-headers, .pool-row {
    display: grid;
    grid-column-gap: $column-gutter;
    margin-bottom: 10px;
    align-items: center;

    &.cidr {
      grid-template-columns: 40%+$column-gutter 40%+$column-gutter 15%;
    }

    &.range {
      grid-template-columns: 20% 20% 20% 20% 15%;
    }
  }
</style>
