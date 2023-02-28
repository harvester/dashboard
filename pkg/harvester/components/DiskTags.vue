<script>
import { _VIEW, _EDIT, _CREATE } from '@shell/config/query-params';
import Tag from '@shell/components/Tag';

export default {
  name: 'Tags',

  components: { Tag },

  props: {
    value: {
      type:     Array,
      required: true,
    },

    label: {
      type:    String,
      default: '',
    },

    labelKey: {
      type:    String,
      default: '',
    },

    addLabel: {
      type:    String,
      default: '',
    },

    addLabelKey: {
      type:    String,
      default: '',
    },

    canAdd: {
      type:    Boolean,
      default: true,
    },

    mode: {
      type:    String,
      default: _CREATE,
    },

    disabled: {
      type:    Boolean,
      default: false,
    },
  },

  data() {
    return {
      tags:         this.value,
      inputVisible: false,
      inputValue:   '',
    };
  },

  computed: {
    isCreate() {
      return this.mode === _CREATE;
    },

    isView() {
      return this.mode === _VIEW;
    },

    isEdit() {
      return this.mode === _EDIT;
    },

    canRemove() {
      return !this.isView;
    },

    addVisible() {
      return this.canAdd && !this.isView;
    },
  },

  methods: {
    onClickPlusButton() {
      this.inputVisible = true;
      this.$nextTick(() => {
        if ( this.$refs.addTagInput ) {
          this.$refs.addTagInput.focus();
        }
      });
    },

    confirmAdd() {
      if (this.inputValue && !this.value.includes(this.inputValue)) {
        this.tags.push(this.inputValue);
        this.$emit('input', this.tags);
      }

      this.inputValue = '';
      this.inputVisible = false;
    },

    onRemoveTag(tag) {
      this.tags = this.tags.filter(v => v !== tag);
      this.$emit('input', this.tags);
    },
  }
};
</script>

<template>
  <div>
    <div class="label">
      <div class="text-label">
        <t
          v-if="labelKey"
          :k="labelKey"
        />
        <template v-else-if="label">
          {{ label }}
        </template>
      </div>
    </div>
    <div class="mt-10">
      <Tag
        v-for="(tag) in value"
        :key="tag"
        class="tag"
      >
        <span>
          {{ tag }}
        </span>
        <i
          v-if="canRemove"
          class="icon icon-close ml-5 icon-sm"
          @click="(e) => onRemoveTag(tag)"
        />
      </Tag>
      <span
        v-if="addVisible && !inputVisible"
        class="tag add"
        @click="onClickPlusButton"
      >
        <i class="icon icon-plus icon-sm" />
        <span>
          <t
            v-if="addLabelKey"
            :k="addLabelKey"
          />
          <template v-else-if="addLabel">
            {{ addLabel }}
          </template>
        </span>
      </span>
      <span
        v-else-if="addVisible && inputVisible"
        class="tag input"
      >
        <input
          ref="addTagInput"
          v-model="inputValue"
          type="text"
          size="small"
          @blur="confirmAdd"
          @keydown.enter.prevent="confirmAdd"
        />
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .tag {
    border: 1px solid var(--primary);
    border-radius: var(--border-radius);
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-size: 14px;
    line-height: 20px;
    list-style: none;
    display: inline-block;
    height: auto;
    margin-inline-end: 8px;
    padding-inline: 7px;
    white-space: nowrap;
    background: var(--accent-btn);
    opacity: 1;
    text-align: start;
    color: var(--link);
    margin-bottom: 10px;
    margin-right: 8px;
    padding-top: 8px;
    padding-bottom: 8px;

    i {
      cursor: pointer;
    }

    &.add {
      background: var(--body-bg);
      border-style: dashed;
      cursor: pointer;
    }

    &.input {
      border: none;
      border-radius: none;
      background: var(--body-bg);
      padding: 0px;
    }
  }
</style>
