<script>
import UnitInput from '@shell/components/form/UnitInput';
import InputOrDisplay from '@shell/components/InputOrDisplay';
import { HCI } from '@shell/config/labels-annotations';

export default {
  name:       'TotalSnapshotSize',
  components: { UnitInput, InputOrDisplay },

  props: {
    value: {
      type:     Object,
      required: true,
    },
    // totalSnapshotSize: {
    //   type:    String,
    //   default: null,
    // },
    mode: {
      type:    String,
      default: 'create',
    },

  },

  data() {
    const annotationSize = this.value?.annotations?.[HCI.TOTAL_SNAPSHOT_SIZE];
    const localTotalSnapshotSize = annotationSize?.endsWith('Gi') ? annotationSize : null;

    return { localTotalSnapshotSize };
  },

  computed: {
    totalSnapshotDisplay() {
      return `${ this.localTotalSnapshotSize }`;
    }
  },
  methods: {
    change(newSize) {
      const size = newSize === null ? '' : newSize;

      this.$emit('updateTotalSnapshotSize', size);
    },
  }
};
</script>

<template>
  <div class="row">
    <InputOrDisplay
      :name="t('namespace.snapshots.totalSnapshotSize')"
      :value="localTotalSnapshotSize"
      :mode="mode"
      class="mb-10"
    >
      <UnitInput
        v-model="localTotalSnapshotSize"
        v-int-number
        :label="t('namespace.snapshots.totalSnapshotSize')"
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
