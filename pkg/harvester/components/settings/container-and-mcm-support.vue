<script>
import { Checkbox } from '@components/Form/Checkbox';
import { _EDIT } from '@shell/config/query-params';

export default {
  name: 'HarvesterSslParameters',

  components: { Checkbox },

  props: {
    mode: {
      type:    String,
      default: _EDIT,
    },

    value: {
      type:    Object,
      default: () => {
        return {};
      },
    },

    registerBeforeHook: {
      type:     Function,
      required: true,
    },
  },

  data() {
    let out = {};

    try {
      out = JSON.parse(this.value.value);
    } catch (error) {
      out = JSON.parse(this.value.default);
    }

    const enableContainer = out['container-management'];
    const enableMcm = out['multi-cluster'];

    return {
      enableMcm,
      enableContainer
    };
  },

  created() {
    if (this.registerBeforeHook) {
      this.registerBeforeHook(this.willSave, 'willSave');
    }
  },

  methods: {
    willSave() {
      const out = JSON.stringify({
        'container-management': this.enableContainer,
        'multi-cluster':        this.enableMcm
      });

      this.$set(this.value, 'value', out);
    },
  },

  watch: {}
};
</script>

<template>
  <div>
    <div class="row mt-10">
      <div class="col span-12">
        <Checkbox v-model="enableContainer" :mode="mode" class="check" type="checkbox" label="Enable Container" />
      </div>
    </div>

    <div class="row">
      <div class="col span-12">
        <Checkbox v-model="enableMcm" :mode="mode" class="check" type="checkbox" label="Enable MCM" />
      </div>
    </div>
  </div>
</template>
