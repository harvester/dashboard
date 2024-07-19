<script>
import { _VIEW } from '@shell/config/query-params';

export default {
  name: 'BootOrderCard',

  props: {
    value: {
      type:     Object,
      required: true
    },

    index: {
      type:    Number,
      default: 0
    },

    count: {
      type:    Number,
      default: 0
    },

    showButtons: {
      type:    Boolean,
      default: true
    },

    mode: {
      type:     String,
      required: true
    },

    disabled: {
      type:    Boolean,
      default: false
    }
  },

  computed: {
    isView() {
      return this.mode === _VIEW;
    },
  },

  methods: {
    swap(dir) {
      this.$emit('input', dir);
    },
    onMouseDown() {
      this.$emit('mousedown');
    },
    onMouseUp() {
      this.$emit('mouseup');
    },
  }
};
</script>

<template>
  <div
    class="boot-order-card"
    :class="{ disabled: disabled }"
    @mousedown="onMouseDown"
    @mouseup="onMouseUp"
  >
    <div class="content">
      <div class="body">
        <h3>{{ value.name }}</h3>
      </div>
      <div class="description text-muted">
        <span>{{ value.type }}</span>
      </div>
    </div>
    <slot name="buttons">
      <div v-if="!isView && showButtons" class="buttons actions" @mousedown.stop @mouseup.stop>
        <div class="buttons-container">
          <button :disabled="index === 0" class="btn btn-sm role-primary" @click.prevent="swap(-1)">
            <i class="icon icon-lg icon-chevron-up"></i>
          </button>

          <button :disabled="index === count - 1" class="btn btn-sm role-primary" @click.prevent="swap(1)">
            <i class="icon icon-lg icon-chevron-down"></i>
          </button>
        </div>
      </div>
    </slot>
  </div>
</template>

<style lang="scss" scoped>
  .boot-order-card {
    display: flex;
    flex-direction: row;
    justify-content: space-between;

    border: 1px solid var(--tabbed-border);
    box-shadow: 0 0 10px var(--shadow);
    border-radius: var(--border-radius);

    height: 65px;
    padding: 10px;

    &.disabled {
      cursor: not-allowed;
      h3 {
        color: var(--muted) !important;
      }
    }

    .content {
      display: flex;
      flex-direction: column;
      justify-content: space-between;

      .body {
        max-width: 500px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        h3 {
          margin: 0;
        }
      }
      .description {
        max-width: 550px;
        word-wrap: break-word;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .actions {
      display: flex;
      padding-top: 6px;

      .buttons-container {
        .btn {
          margin-left: 4px;
        }
      }
    }
  }
</style>
