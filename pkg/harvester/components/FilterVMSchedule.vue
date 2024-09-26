<script>
import { RadioGroup } from '@components/Form/Radio';

export default {
  name: 'HarvesterFilterVMSchedule',

  components: { RadioGroup },

  props: {
    rows: {
      type:     Array,
      required: true,
    },
  },

  data() {
    return { selected: '' };
  },

  computed: {
    scheduleOptions() {
      const options = this.rows.map(r => r.sourceSchedule).filter(r => r);

      return Array.from(new Set(options));
    },
  },

  methods: {
    onSelect(selected) {
      this.selected = selected;
      this.filterRows();
    },

    remove() {
      this.selected = '';
      this.filterRows();
    },

    filterRows() {
      if (!this.selected) {
        this.$emit('change-rows', this.rows);

        return;
      }
      const filteredRows = this.rows.filter(row => row.sourceSchedule === this.selected);

      this.$emit('change-rows', filteredRows, this.selected);
    }
  },

  watch: {
    rows: {
      deep:      true,
      immediate: false,
      handler() {
        this.filterRows();
      }
    }
  }
};
</script>

<template>
  <div class="vm-schedule-filter">
    <template>
      <span v-if="selected" class="banner-item bg-warning">
        {{ t('harvester.tableHeaders.vmSchedule') }}{{ selected ? ` = ${selected}`: '' }}<i class="icon icon-close ml-5" @click="remove" />
      </span>
    </template>

    <v-popover
      :trigger="scheduleOptions.length ? 'click' : 'manual'"
      placement="bottom-end"
    >
      <slot name="header">
        <button ref="actionDropDown" class="btn bg-primary mr-10">
          <slot name="title">
            {{ t('harvester.fields.filterSchedule') }}
          </slot>
        </button>
      </slot>
      <template slot="popover">
        <div class="filter-popup">
          <RadioGroup
            v-model="selected"
            class="mr-10 ml-10"
            name="model"
            :options="scheduleOptions"
            :labels="scheduleOptions"
            @input="onSelect"
          />
        </div>
      </template>
    </v-popover>
  </div>
</template>

<style lang="scss" scoped>
.vm-schedule-filter {
  display: inline-block;

  .banner-item {
    display: inline-block;
    font-size: 16px;
    margin-right: 10px;
    padding: 6px;
    border-radius: 2px;

    i {
      cursor: pointer;
      vertical-align: middle;
    }
  }
}
.filter-popup {
  width: max-content;
}

</style>
