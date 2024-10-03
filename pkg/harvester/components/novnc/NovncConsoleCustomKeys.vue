<script>
import { STEVE } from '@shell/config/types';
import Banner from '@components/Banner/Banner.vue';
import AsyncButton from '@shell/components/AsyncButton';
import ModalWithCard from '@shell/components/ModalWithCard';

const PREFERED_SHORTCUT_KEYS = 'prefered-shortcut-keys';

export default {
  name:       'NovncConsoleCustomKeys',
  components: {
    ModalWithCard, Banner, AsyncButton
  },

  data() {
    return {
      keysRecord:            [],
      addedShortcutKeys:     [],
      preferredShortcutKeys: [],
      isRecording:           false,
    };
  },

  computed: {
    savedShortcutKeys() {
      const preference = this.$store.getters['management/all'](STEVE.PREFERENCE);
      const preferedShortcutKeys = preference?.[0]?.data?.[PREFERED_SHORTCUT_KEYS];
      let out = [];

      if (!preferedShortcutKeys) {
        return out;
      }

      try {
        out = JSON.parse(preferedShortcutKeys);
      } catch (err) {
        this.$store.dispatch('growl/fromError', {
          title: this.t('generic.notification.title.error', { name: this.t('harvester.virtualMachine.detail.console.customShortcutKeys') }),
          err,
        }, { root: true });
      }

      return out;
    },

    displayedKeys() {
      const out = this.addedShortcutKeys.concat(this.preferredShortcutKeys).map((item) => {
        const out = item.map(K => ` <code>${ K.key.charAt(0).toUpperCase() + K.key.slice(1) }</code>`);

        return out.join(',');
      });

      return out;
    },

    recordButton() {
      if (this.isRecording) {
        return 'harvester.virtualMachine.detail.console.record.stop';
      }

      return 'harvester.virtualMachine.detail.console.record.start';
    },

    keysRecordFormat() {
      if (!this.isRecording && this.keysRecord.length === 0) {
        return this.t('harvester.virtualMachine.detail.console.record.tips');
      }

      const out = this.keysRecord.map(item => ` <code>${ item.key.charAt(0).toUpperCase() + item.key.slice(1) }</code>`);

      return `Keys: ${ out.join(',') }`;
    },

    canAdd() {
      const hasRecord = this.keysRecord.length > 0;
      let validationList = [].concat(this.preferredShortcutKeys, this.addedShortcutKeys);

      if (!hasRecord) {
        return false;
      }

      validationList.push(this.keysRecord);

      validationList = validationList.map((item) => {
        const out = item.map(K => K.key);

        return out.join(',');
      });

      return validationList.length === new Set(validationList).size;
    },
  },

  watch: {
    savedShortcutKeys: {
      handler() {
        this.preferredShortcutKeys = [].concat(this.savedShortcutKeys) || [];
      },
      immediate: true
    },
  },

  methods: {
    closeRecordingModal() {
      window.removeEventListener('keydown', this.handleShortcut);
      this.$emit('close');
    },

    toggleRecording() {
      this.isRecording = !this.isRecording;

      if (this.isRecording) {
        this.keysRecord = [];
        window.addEventListener('keydown', this.handleShortcut);
      } else {
        window.removeEventListener('keydown', this.handleShortcut);
      }
    },

    handleShortcut(event) {
      event.preventDefault();

      const {
        key, keyCode, code, location, charCode
      } = event;

      this.keysRecord.push({
        key, keyCode, code, location, charCode
      });
    },

    addShortcutKey() {
      this.addedShortcutKeys.push([].concat(this.keysRecord));
    },

    removeKey(keys) {
      const key = keys.replace(/(\s*)<code>|<\/code>/g, '').replace(/\s*,\s*/g, ',');

      this.addedShortcutKeys = this.addedShortcutKeys.filter((item) => {
        const formatkey = item.map(K => K.key.charAt(0).toUpperCase() + K.key.slice(1)).join(',');

        return formatkey !== key;
      });

      this.preferredShortcutKeys = this.preferredShortcutKeys.filter((item) => {
        const formatkey = item.map(K => K.key.charAt(0).toUpperCase() + K.key.slice(1)).join(',');

        return formatkey !== key;
      });
    },

    async saveKeys(buttonCb) {
      const out = [].concat(this.preferredShortcutKeys, this.addedShortcutKeys);
      const preference = this.$store.getters['management/all'](STEVE.PREFERENCE)?.[0];

      try {
        this.$set(preference.data, PREFERED_SHORTCUT_KEYS, JSON.stringify(out));
        await preference.save();
        this.closeRecordingModal();
        buttonCb(true);
      } catch (err) {
        buttonCb(false);
      }
    },
  }
};
</script>

<template>
  <ModalWithCard
    name="recordShortcutKeys"
    :width="550"
  >
    <template #title>
      <t k="harvester.virtualMachine.detail.console.customShortcutKeys" />
    </template>

    <template #content>
      <div class="row">
        <div class="col span-12">
          <Banner color="info">
            <span v-clean-html="keysRecordFormat"></span>
          </Banner>
        </div>
      </div>
      <div class="row">
        <div class="col span-12">
          <button class="btn bg-primary" @click="toggleRecording">
            <t :k="recordButton" />
            <i class="icon icon-fw" :class="isRecording ? 'icon-dot-open' : 'icon-dot'" />
          </button>
          <button :disabled="!canAdd" class="btn bg-primary" @click="addShortcutKey">
            <t k="generic.add" />
          </button>
        </div>
      </div>

      <hr>

      <div class="displayed-keys mt-20">
        <h4
          v-clean-html="t('harvester.virtualMachine.detail.console.record.preferredKeys')"
          class="text-default-text"
        />

        <div class="displayed-banners">
          <Banner v-for="(keys,index) in displayedKeys" :key="index" color="info" :closable="true" @close="removeKey(keys)">
            <span v-clean-html="keys"></span>
          </Banner>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="actions">
        <button class="btn role-secondary mr-20" @click.prevent="closeRecordingModal">
          <t k="generic.close" />
        </button>
        <AsyncButton
          mode="done"
          @click="saveKeys"
        />
      </div>
    </template>
  </ModalWithCard>
</template>

<style lang="scss" scoped>
  .displayed-keys {
    .banner {
      margin: 0;
    }
  }

  .displayed-banners {
    max-height: 155px;
    overflow: auto;
  }

  .actions {
    width: 100%;
    display: flex;
    justify-content: flex-end;
  }
</style>
