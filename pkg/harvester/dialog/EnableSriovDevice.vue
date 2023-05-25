<script>
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import { mapGetters } from 'vuex';
import { Card } from '@components/Card';
import AsyncButton from '@shell/components/AsyncButton';
import { escapeHtml } from '@shell/utils/string';

export default {
  name: 'HarvesterEnableSriovDevice',

  components: {
    LabeledInput,
    AsyncButton,
    Card,
  },

  props: {
    resources: {
      type:     Array,
      required: true
    }
  },

  data() {
    const numVFs = this.resources[0].spec?.numVFs || 1;

    return { numVFs, numVFsHistory: numVFs };
  },

  computed: { ...mapGetters({ t: 'i18n/t' }) },

  methods: {
    close() {
      this.$emit('close');
    },

    async save(buttonCb) {
      const actionResource = this.resources[0];

      try {
        this.resources[0].spec.numVFs = this.numVFs;
        if (this.resources[0].spec.numVFs <= 0) {
          this.resources[0].spec.numVFs = 0;
          this.numVFs = 0;
          this.close();

          return;
        }
        await actionResource.save();
        buttonCb(true);
        this.close();
      } catch (err) {
        this.resources[0].spec.numVFs = this.numVFsHistory;
        this.$store.dispatch('growl/fromError', {
          title: this.t('generic.notification.title.error', { name: escapeHtml(actionResource.metadata.name) }),
          err,
        }, { root: true });
        buttonCb(false);
      }
    }
  }
};
</script>

<template>
  <Card :show-highlight-border="false">
    <template v-slot:title>
      <h4
        class="text-default-text"
        v-html="t('promptRemove.title')"
      />
    </template>

    <template #body>
      <LabeledInput
        v-model.number="numVFs"
        type="number"
        min="0"
        required
        :label="t('harvester.sriov.numVFs')"
      />
    </template>

    <template v-slot:actions>
      <div class="buttons actions">
        <button class="btn role-secondary mr-10" @click="close">
          {{ t('generic.cancel') }}
        </button>

        <AsyncButton mode="enable" @click="save" />
      </div>
    </template>
  </Card>
</template>

<style lang="scss" scoped>
.actions {
  width: 100%;
}

.buttons {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}
</style>
