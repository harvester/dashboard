<script>
import debounce from 'lodash/debounce';

import LabeledSelect from '@shell/components/form/LabeledSelect';
import { LabeledInput } from '@components/Form/LabeledInput';
import Priority from './Priority';

import { NETWORK_ATTACHMENT } from '@shell/config/types';
import { _EDIT } from '@shell/config/query-params';

export default {
  components: {
    LabeledSelect,
    LabeledInput,
    Priority,
  },

  props: {
    value: {
      type:    Object,
      default: () => {
        return {};
      },
    },
    mode: {
      type:    String,
      default: _EDIT,
    },
  },

  data() {
    const selector = this.value || {
      network:  '',
      priority: 0,
      scope:    [],
    };

    return { selector };
  },

  computed: {
    networkOptions() {
      const networks = this.$store.getters['harvester/all'](NETWORK_ATTACHMENT) || [];

      return [{
        label: this.t('generic.none'),
        value: '',
      }, ...networks.map(n => ({
        label: n.id,
        value: n.id,
      }))];
    },
  },

  created() {
    this.queueUpdate = debounce(this.update, 500);
  },

  methods: {
    update() {
      if ( this.isView ) {
        return;
      }

      this.$emit('input', this.selector);
    }
  },
};
</script>

<template>
  <div>
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model="selector.network"
          :label="t('harvester.ipPool.network.label')"
          :options="networkOptions"
          :mode="mode"
          @input="queueUpdate"
        />
      </div>
      <div class="col span-6">
        <LabeledInput
          v-model.number="selector.priority"
          :label="t('harvester.ipPool.priority.label')"
          :mode="mode"
          type="number"
          min="0"
          @input="update"
        />
      </div>
    </div>
    <Priority
      v-model="selector.scope"
      class="col span-12"
      :mode="mode"
      @input="update"
    />
  </div>
</template>
