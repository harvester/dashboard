<script>
import debounce from 'lodash/debounce';
import { _EDIT, _VIEW } from '@shell/config/query-params';
import { removeAt } from '@shell/utils/array';
import { clone } from '@shell/utils/object';
import { mapGetters } from 'vuex';
import PriorityRow from './PriorityRow';

export default {
  components: { PriorityRow },

  props: {
    value: {
      type:    Array,
      default: null,
    },
    mode: {
      type:    String,
      default: _EDIT,
    },
    autoAddIfEmpty: {
      type:    Boolean,
      default: true,
    }
  },

  data() {
    const rows = clone(this.value || []);

    return { rows };
  },

  computed: {
    ...mapGetters(['isRancherInHarvester', 'isStandaloneHarvester']),

    isView() {
      return this.mode === _VIEW;
    },

    showAdd() {
      return !this.isView;
    },

    showRemove() {
      return !this.isView;
    },

    showProjectAndCluster() {
      return !this.isStandaloneHarvester;
    },
  },

  created() {
    this.queueUpdate = debounce(this.update, 500);
  },

  methods: {
    add() {
      const defaultRow = { namespace: '*' };

      if (!this.showProjectAndCluster) {
        this.rows.push(defaultRow);
      } else {
        this.rows.push({
          ...defaultRow,
          project:      '*',
          guestCluster: '*',
        });
      }

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
    <h3>
      {{ t('harvester.ipPool.scope.label') }}
    </h3>
    <div v-if="rows.length">
      <div
        class="pool-headers"
        :class="{
          'show-project-and-cluster': showProjectAndCluster,
        }"
      >
        <span
          v-if="showProjectAndCluster"
          class="pool-project"
        >
          <t k="harvester.ipPool.project.label" />
        </span>
        <span class="pool-namespace">
          <t k="harvester.ipPool.namespace.label" />
        </span>
        <span
          v-if="showProjectAndCluster"
          class="pool-guestCluster"
        >
          <t k="harvester.ipPool.guestCluster.label" />
        </span>
        <span
          v-if="showRemove"
          class="remove"
        />
      </div>
      <div
        v-for="(row, idx) in rows"
        :key="idx"
      >
        <PriorityRow
          :row="row"
          :mode="mode"
          :rows="rows"
          :idx="idx"
          @input="queueUpdate"
          @remove="remove(idx)"
        />
      </div>
    </div>
    <div v-if="showAdd" class="footer">
      <button type="button" class="btn role-tertiary add" @click="add()">
        <t k="harvester.ipPool.scope.addLabel" />
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .pool-headers {
    display: grid;
    grid-column-gap: $column-gutter;
    margin-bottom: 10px;
    align-items: center;

    grid-template-columns: 40% 40% 15%;

    &.show-project-and-cluster {
      grid-template-columns: 25% 25% 25% 15%;
    }
  }
</style>
