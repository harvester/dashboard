<script>
import { mapGetters } from 'vuex';
import { Banner } from '@components/Banner';
import Loading from '@shell/components/Loading';
import { VIEW_IN_API, DEV } from '@shell/store/prefs';
import { MANAGEMENT } from '@shell/config/types';
import { HCI } from '../types';
import { allHash } from '@shell/utils/promise';
import { HCI_ALLOWED_SETTINGS, HCI_SINGLE_CLUSTER_ALLOWED_SETTING } from '../config/settings';
import Tabbed from '@shell/components/Tabbed/index.vue';
import Tab from '@shell/components/Tabbed/Tab.vue';
import Settings from '@pkg/harvester/components/SettingList.vue';

export default {
  components: {
    Banner,
    Loading,
    Tabbed,
    Tab,
    Settings,
  },

  async fetch() {
    let isDev;

    try {
      isDev = this.$store.getters['prefs/get'](VIEW_IN_API);
    } catch {
      isDev = this.$store.getters['prefs/get'](DEV);
    }

    const isSingleProduct = !!this.$store.getters['isSingleProduct'];
    const inStore = this.$store.getters['currentProduct'].inStore;

    const hash = { harvesterSettings: this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.SETTING }) };

    if (isSingleProduct) {
      hash.settings = this.$store.dispatch('management/findAll', { type: MANAGEMENT.SETTING });
    }

    const rows = await allHash(hash);

    let allRows = [];

    allRows.push(...rows.harvesterSettings);

    if (isSingleProduct) {
      allRows = [...rows.settings, ...allRows];
    }

    // Map settings from array to object keyed by id
    const settingsMap = allRows.reduce((res, s) => {
      res[s.id] = s;

      return res;
    }, {});

    const initSettings = [];
    let SETTINGS = HCI_ALLOWED_SETTINGS;

    if (this.isStandaloneHarvester) {
      SETTINGS = {
        ...SETTINGS,
        ...HCI_SINGLE_CLUSTER_ALLOWED_SETTING,
      };
    }

    Object.keys(SETTINGS).forEach((setting) => {
      if (!settingsMap[setting]) {
        return;
      }
      const realSetting = SETTINGS[setting]?.alias || setting;
      const s = {
        ...SETTINGS[setting],
        id:   realSetting,
        data: settingsMap[setting],
      };

      s.hide = s.canHide = (s.kind === 'json' || s.kind === 'multiline' || s.customFormatter === 'json' || s.data.customFormatter === 'json');
      s.hasActions = !s.readOnly || isDev;
      initSettings.push(s);
    });

    this.initSettings = initSettings.sort((a, b) => {
      if (a.id < b.id) {
        return -1;
      }
      if (a.id > b.id) {
        return 1;
      }

      return 0;
    });
  },

  data() {
    return { initSettings: [] };
  },

  computed: {
    ...mapGetters({ t: 'i18n/t' }),
    ...mapGetters(['isStandaloneHarvester']),

    settings() {
      return this.initSettings.map((setting) => {
        const s = setting;

        const isHarvester = s.data?.type?.includes('harvesterhci');

        if (s.kind === 'json') {
          try {
            s.json = JSON.stringify(JSON.parse(s.data.value || s.data.default || '{}'), null, 2);
          } catch (e) {
            console.error(`${ s.data.id }: wrong format`); // eslint-disable-line no-console
            s.json = {};
          }
        } else if (s.kind === 'enum') {
          const v = s.data.value || s.data.default;

          s.enum = isHarvester ? `advancedSettings.enum.harv-${ s.id }.${ v }` : `advancedSettings.enum.${ s.id }.${ v }`;
        } else if (s.kind === 'custom') {
          s.custom = s.data.customValue;
        }

        return {
          ...s,
          description: isHarvester ? `advancedSettings.descriptions.harv-${ s.id }` : `advancedSettings.descriptions.${ s.id }`,
          customized:  (!s.readOnly && s.data.value && s.data.value !== s.data.default) || s.data.hasCustomized
        };
      });
    }
  },
};
</script>

<template>
  <Loading v-if="$fetchState.pending" />
  <div v-else>
    <Banner color="warning" class="settings-banner">
      <div>
        {{ t('harvester.setting.modifiedMessage') }}
      </div>
    </Banner>

    <Tabbed
      class="mt-30"
    >
      <Tab
        name="advanced"
        :label="t('harvester.setting.tabs.advanced')"
        :weight="99"
      >
        <Settings
          :settings="settings"
          category="advanced"
        />
      </Tab>
      <Tab
        name="ui"
        :label="t('harvester.setting.tabs.ui')"
        :weight="89"
      >
        <Settings
          :settings="settings"
          category="ui"
        />
      </Tab>
    </Tabbed>
  </div>
</template>

<style lang='scss' scoped>
.settings-banner {
  margin-top: 0;
}
</style>
