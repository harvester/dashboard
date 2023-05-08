<script>
import CreateEditView from '@shell/mixins/create-edit-view';
import UnitInput from '@shell/components/form/UnitInput';

export default {
  name: 'DefaultVMTerminationGracePeriodSeconds',

  components: { UnitInput },

  mixins: [CreateEditView],

  data() {
    return { terminationGracePeriodSeconds: this.value.value || this.value.default };
  },

  methods: {
    update() {
      this.$set(this.value, 'value', String(this.terminationGracePeriodSeconds));
    },

    useDefault() {
      this.$set(this, 'terminationGracePeriodSeconds', Number(this.value.default));
      this.update();
    },
  },
};
</script>

<template>
  <div
    class="row"
  >
    <div class="col span-12">
      <UnitInput
        v-model="terminationGracePeriodSeconds"
        :suffix="terminationGracePeriodSeconds === 1 ? 'Second' : 'Seconds'"
        :label="t('harvester.virtualMachine.terminationGracePeriodSeconds.label')"
        :mode="mode"
        @input="update"
      />
    </div>
  </div>
</template>
