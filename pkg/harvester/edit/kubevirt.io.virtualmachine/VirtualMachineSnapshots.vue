<script>
import UnitInput from '@shell/components/form/UnitInput';
import InputOrDisplay from '@shell/components/InputOrDisplay';

export default {
  name:       'HarvesterVMSnapshot',
  components: { UnitInput, InputOrDisplay },

  props: {
    totalSnapshotSize: {
      type:    String,
      default: null
    },
    disabled: {
      type:    Boolean,
      default: false
    },
    mode: {
      type:    String,
      default: 'create',
    },
  },

  data() {
    return { localTotalSnapshotSize: this.totalSnapshotSize };
  },

  computed: {
    totalSnapshotDisplay() {
      return `${ this.localTotalSnapshotSize }`;
    }
  },

  watch: {
    totalSnapshotDisplay(neu) {
      if (neu && !neu.includes('null')) {
        this.localTotalSnapshotSize = neu;
      }
    }
  },

  methods: {
    change() {
      let totalSnapSize = '';

      console.log('🚀 ~ change localTotalSnapshotSize=', typeof this.localTotalSnapshotSize, 'value = ', this.localTotalSnapshotSize);
      if (this.localTotalSnapshotSize === null) {
        totalSnapSize = null;
      } else {
        totalSnapSize = this.localTotalSnapshotSize;
      }
      this.$emit('updateTotalSnapshotSize', totalSnapSize);
    },

  }
};
</script>

<template>
  <div class="row">
    <InputOrDisplay
      :name="t('harvester.snapshot.totalSnapshotSize')"
      :value="totalSnapshotDisplay"
      :mode="mode"
      class="mb-10"
    >
      <UnitInput
        v-model="localTotalSnapshotSize"
        v-int-number
        :label="t('harvester.snapshot.totalSnapshotSize')"
        :disabled="disabled"
        :mode="mode"
        :input-exponent="3"
        :increment="1024"
        :output-modifier="true"
        suffix="GiB"
        class="mb-20"
        @input="change"
      />
    </InputOrDisplay>
  </div>
</template>
