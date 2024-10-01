<script>
import { mapGetters, mapState } from 'vuex';
import { Card } from '@components/Card';
import { Banner } from '@components/Banner';
import AsyncButton from '@shell/components/AsyncButton';
import UnitInput from '@shell/components/form/UnitInput';
import { exceptionToErrorsArray } from '@shell/utils/error';

export default {
  name: 'HarvesterVMQuotaDialog',

  components: {
    AsyncButton,
    Card,
    UnitInput,
    Banner
  },

  props: {
    resources: {
      type:     Array,
      required: true
    }
  },

  created() {
    this.totalSnapshotSize = this.modalData.snapshotSizeQuota;
  },

  data() {
    return {
      totalSnapshotSize: '',
      errors:            []
    };
  },

  computed: {
    ...mapState('action-menu', ['modalData']),
    ...mapGetters({ t: 'i18n/t' }),

    actionResource() {
      return this.resources[0];
    },
  },

  methods: {

    close() {
      this.totalSnapshotSize = '';
      this.$emit('close');
    },

    async save(buttonDone) {
      try {
        // call delete action if user input 0Gi or empty string
        if (this.totalSnapshotSize === null || this.totalSnapshotSize === '0Gi' ) {
          await this.actionResource.doAction('deleteResourceQuota');
        } else {
          await this.actionResource.doAction('updateResourceQuota', { totalSnapshotSizeQuota: this.totalSnapshotSize });
        }
        this.close();
        buttonDone(true);
      } catch (err) {
        const error = err?.data || err;
        const message = exceptionToErrorsArray(error);

        this.$set(this, 'errors', message);
        buttonDone(false);
      }
    },
  }
};
</script>

<template>
  <Card :show-highlight-border="false">
    <h4
      slot="title"
      v-clean-html="t('harvester.modal.quota.editQuota')"
      class="text-default-text"
    />
    <template #body>
      <Banner color="info">
        {{ t('harvester.modal.quota.bannerMessage') }}
      </Banner>
      <UnitInput
        v-model="totalSnapshotSize"
        v-int-number
        :label="t('harvester.snapshot.totalSnapshotSize')"
        :disabled="false"
        :input-exponent="3"
        :increment="1024"
        :output-modifier="true"
        suffix="GiB"
        class="mb-20"
      />
    </template>
    <div slot="actions" class="actions">
      <div class="buttons">
        <button class="btn role-secondary mr-10" @click="close">
          {{ t('generic.cancel') }}
        </button>
        <AsyncButton @click="save" />
      </div>
      <Banner v-for="(err, i) in errors" :key="i" color="error" :label="err" />
    </div>
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
