<script>
import { mapGetters } from 'vuex';
import AsyncButton from '@shell/components/AsyncButton';
import AppModal from '@shell/components/AppModal';
import { Card } from '@components/Card';
import { Banner } from '@components/Banner';
import { exceptionToErrorsArray } from '@shell/utils/error';

export default {
  components: {
    Card,
    AsyncButton,
    Banner,
    AppModal
  },
  props: {
    vm: {
      type:     Object,
      required: true
    },
  },
  data() {
    return {
      errors:  [],
      resolve: null,
      isOpen:  false
    };
  },
  computed: { ...mapGetters({ t: 'i18n/t' }) },
  methods:  {
    open() {
      this.isOpen = true;
    },
    close() {
      this.isOpen = false;
      this.resolve();
      this.$emit('close');
    },
    apply(buttonDone) {
      try {
        this.vm.doActionGrowl('restart', {});
        buttonDone(true);
        this.resolve();
        this.close();
      } catch (err) {
        console.error(err); // eslint-disable-line
        this.errors = exceptionToErrorsArray(err);
        buttonDone(false);
      }
    }
  }
};
</script>

<template>
  <app-modal
    v-if="isOpen"
    class="restart-modal"
    name="restartDialog"
    :width="600"
    height="auto"
    :click-to-close="false"
    @close="close"
  >
    <Card class="prompt-restart" :show-highlight-border="false">
      <h4 slot="title" v-clean-html="t('harvester.modal.restart.title')" class="text-default-text" />

      <template slot="body">
        <slot name="body">
          <div v-clean-html="t('harvester.modal.restart.tip')" class="pl-10 pr-10">
          </div>
        </slot>
      </template>

      <div slot="actions" class="bottom">
        <Banner v-for="(err, i) in errors" :key="i" color="error" :label="err" />
        <div class="buttons">
          <button class="btn role-secondary mr-10" @click="close">
            {{ t('harvester.modal.restart.cancel') }}
          </button>

          <AsyncButton
            mode="restart"
            @click="apply"
          />
        </div>
      </div>
    </Card>
  </app-modal>
</template>
<style lang='scss' scoped>
  .restart-modal {
    z-index: 45;
  }
  .prompt-restart {
    margin: 0;
  }
  .bottom {
    display: flex;
    flex-direction: column;
    flex: 1;
    .banner {
      margin-top: 0
    }
    .buttons {
      display: flex;
      justify-content: flex-end;
      width: 100%;
    }
  }
</style>
