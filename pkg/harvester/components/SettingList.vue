<script>
import { mapGetters } from 'vuex';
import { Banner } from '@components/Banner';
import AsyncButton from '@shell/components/AsyncButton';
import { HCI_ALLOWED_SETTINGS, HCI_SETTING } from '../config/settings';

const CATEGORY = {
  ui: [
    'branding',
    'ui-source',
    'ui-plugin-index',
    'ui-index',
  ]
};

export default {
  name: 'SettingLists',

  components: {
    AsyncButton,
    Banner,
  },

  props: {
    settings: {
      type:     Array,
      required: true,
    },

    category: {
      type:     String,
      required: true,
    }
  },

  data() {
    const categorySettings = this.filterCategorySettings();

    return {
      HCI_SETTING,
      categorySettings,
    };
  },

  computed: { ...mapGetters({ t: 'i18n/t' }) },

  watch: {
    settings: {
      deep: true,
      handler() {
        this.$set(this, 'categorySettings', this.filterCategorySettings());
      }
    }
  },

  methods: {
    filterCategorySettings() {
      return this.settings.filter((s) => {
        if (this.category !== 'advanced') {
          return (CATEGORY[this.category] || []).find(item => item === s.id);
        } else if (this.category === 'advanced') {
          const allCategory = Object.keys(CATEGORY);

          return !allCategory.some(category => (CATEGORY[category] || []).find(item => item === s.id));
        }
      }) || [];
    },
    showActionMenu(e, setting) {
      const actionElement = e.srcElement;

      this.$store.commit(`action-menu/show`, {
        resources: setting.data,
        elem:      actionElement
      });
    },

    getSettingOption(id) {
      return HCI_ALLOWED_SETTINGS.find(setting => setting.id === id);
    },

    toggleHide(s) {
      this.categorySettings.find((setting) => {
        if (setting.id === s.id) {
          setting.hide = !setting.hide;
        }
      });
    },

    async testConnect(buttonDone, value) {
      try {
        const url = this.$store.getters['harvester-common/getHarvesterClusterUrl']('v1/harvester/backuptarget/healthz');

        const health = await this.$store.dispatch('harvester/request', { url });
        const settingValue = JSON.parse(value);

        if (health?._status === 200) {
          this.$store.dispatch('growl/success', {
            title:   this.t('harvester.notification.title.succeed'),
            message: this.t('harvester.backup.message.testConnect.successMessage', { endpoint: settingValue?.endpoint })
          }, { root: true });
        }
        buttonDone(true);
      } catch (err) {
        if (err?._status === 400 || err?._status === 503) {
          this.$store.dispatch('growl/error', {
            title:   this.t('harvester.notification.title.error'),
            message: err?.errors[0]
          }, { root: true });
        }
        buttonDone(false);
      }
    }
  },
};
</script>

<template>
  <div>
    <div v-for="setting in categorySettings" :key="setting.id" class="advanced-setting mb-20">
      <div class="header">
        <div class="title">
          <h1>
            {{ setting.id }}
            <span v-if="setting.customized" class="modified">
              Modified
            </span>
            <span v-if="setting.experimental" v-clean-tooltip="t('advancedSettings.experimental')" class="experimental">
              Experimental
            </span>
          </h1>
          <h2 v-clean-html="t(setting.description, {}, true)">
          </h2>
        </div>
        <div v-if="setting.hasActions" :id="setting.id" class="action">
          <button aria-haspopup="true" aria-expanded="false" type="button" class="btn btn-sm role-multi-action actions" @click="showActionMenu($event, setting)">
            <i class="icon icon-actions" />
          </button>
        </div>
      </div>
      <div value>
        <div v-if="!setting.hide" class="settings-value">
          <pre v-if="setting.kind === 'json'">{{ setting.json }}</pre>
          <pre v-else-if="setting.kind === 'multiline'">{{ setting.data.value || setting.data.default }}</pre>
          <pre v-else-if="setting.kind === 'enum'">{{ t(setting.enum) }}</pre>
          <pre v-else-if="setting.kind === 'custom' && setting.custom">{{ setting.custom }}</pre>
          <pre v-else-if="setting.data.value || setting.data.default">{{ setting.data.value || setting.data.default }}</pre>
          <pre v-else class="text-muted">&lt;{{ t('advancedSettings.none') }}&gt;</pre>
        </div>

        <div class="mt-5">
          <button v-if="setting.hide" class="btn btn-sm role-primary" @click="toggleHide(setting)">
            {{ t('advancedSettings.show') }} {{ setting.id }}
          </button>

          <button v-if="setting.canHide && !setting.hide" class="btn btn-sm role-primary" @click="toggleHide(setting)">
            {{ t('advancedSettings.hide') }} {{ setting.id }}
          </button>

          <AsyncButton
            v-if="setting.id === HCI_SETTING.BACKUP_TARGET"
            class="backupButton ml-5"
            mode="apply"
            size="sm"
            :delay="0"
            :action-label="t('harvester.backup.message.testConnect.actionLabel')"
            :waiting-label="t('harvester.backup.message.testConnect.waitingLabel')"
            :success-label="t('harvester.backup.message.testConnect.successLabel')"
            @click="(buttonCb) => testConnect(buttonCb, setting.data.value)"
          />
        </div>
      </div>
      <Banner v-if="setting.data.errMessage" color="error mt-5" class="settings-banner">
        {{ setting.data.errMessage }}
      </Banner>
    </div>
  </div>
</template>

<style lang='scss' scoped>
.settings-banner {
  margin-top: 0;
}
.advanced-setting {
  border: 1px solid var(--border);
  padding: 20px;
  border-radius: var(--border-radius);

  h1 {
    font-size: 14px;
  }
  h2 {
    font-size: 12px;
    margin-bottom: 0;
    opacity: 0.8;
  }
}

.settings-value pre {
  margin: 0;
}

.header {
  display: flex;
  margin-bottom: 20px;
}

.title {
  flex: 1;
}

.modified {
  margin-left: 10px;
  border: 1px solid var(--primary);
  border-radius: 5px;
  padding: 2px 10px;
  font-size: 12px;
}

.experimental {
  margin-left: 10px;
  border: 1px solid var(--error);
  border-radius: 5px;
  padding: 2px 10px;
  font-size: 12px;
}
</style>
