<script>
import debounce from 'lodash/debounce';
import { _EDIT, _VIEW } from '@shell/config/query-params';
import { removeAt } from '@shell/utils/array';
import { clone } from '@shell/utils/object';
import Select from '@shell/components/form/Select';

export default {
  components: { Select },
  props:      {
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
    isView() {
      return this.mode === _VIEW;
    },

    showAdd() {
      return !this.isView;
    },

    showRemove() {
      return !this.isView;
    },

    protocolOptions() {
      return ['TCP', 'UDP'];
    },
  },

  created() {
    this.queueUpdate = debounce(this.update, 500);
  },

  mounted() {
    if ( this.isView ) {
      return;
    }

    if (this.autoAddIfEmpty && this.mode !== _EDIT && this?.rows.length < 1) {
      // don't focus on mount because we'll pull focus from name/namespace input
      this.add(false);
    }
  },

  methods: {
    add(focus = true) {
      this.rows.push({
        name:        '',
        port:        null,
        protocol:    'TCP',
        backendPort: null,
      });

      this.queueUpdate();

      if (this.rows.length > 0 && focus) {
        this.$nextTick(() => {
          const inputs = this.$refs['port-name'];

          inputs[inputs.length - 1].focus();
        });
      }
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
        class="listener-headers"
      >
        <span class="listener-name">
          <t k="harvester.loadBalancer.listeners.name.label" />
        </span>
        <span class="listener-protocol">
          <t k="harvester.loadBalancer.listeners.protocol.label" />
        </span>
        <span class="listener-port">
          <t k="harvester.loadBalancer.listeners.port.label" />
          <span class="text-error">
            *
          </span>
        </span>
        <span class="listener-backendPort">
          <t k="harvester.loadBalancer.listeners.backendPort.label" />
          <span class="text-error">
            *
          </span>
        </span>
        <span
          v-if="showRemove"
          class="remove"
        />
      </div>
      <div
        v-for="(row, idx) in rows"
        :key="idx"
        class="listener-row"
      >
        <div class="port-name">
          <span v-if="isView">
            {{ row.name }}
          </span>
          <input
            v-else
            ref="port-name"
            v-model.number="row.name"
            type="text"
            :placeholder="t('servicePorts.rules.name.placeholder')"
            @input="queueUpdate"
          />
        </div>
        <div class="port-protocol">
          <span v-if="isView">
            {{ row.protocol }}
          </span>
          <Select
            v-else
            v-model="row.protocol"
            :options="protocolOptions"
            @input="queueUpdate"
          />
        </div>
        <div class="port">
          <span v-if="isView">
            {{ row.port }}
          </span>
          <input
            v-else
            ref="port"
            v-model.number="row.port"
            type="number"
            min="1"
            max="65535"
            :placeholder="t('servicePorts.rules.listening.placeholder')"
            @input="queueUpdate"
          />
        </div>
        <div class="target-port">
          <span v-if="isView">{{ row.backendPort }}</span>
          <input
            v-else
            v-model.number="row.backendPort"
            :placeholder="t('harvester.loadBalancer.listeners.backendPort.placeholder')"
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
    <div v-if="showAdd" class="footer">
      <button type="button" class="btn role-tertiary add" @click="add()">
        <t k="generic.add" />
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .listener-headers, .listener-row{
    display: grid;
    grid-column-gap: $column-gutter;
    margin-bottom: 10px;
    align-items: center;
    grid-template-columns: 35% 15% 15% 15% 15%;
  }
</style>
