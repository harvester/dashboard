<script>
import { mapGetters } from 'vuex';
import { HCI } from '../types';
import { allHash } from '@shell/utils/promise';
import { Checkbox } from '@components/Form/Checkbox';
import ModalWithCard from '@shell/components/ModalWithCard';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { Banner } from '@components/Banner';
import UpgradeInfo from './UpgradeInfo';
export default {
  name: 'HarvesterUpgrade',

  components: {
    Checkbox, ModalWithCard, LabeledSelect, Banner, UpgradeInfo
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;

    const res = await allHash({
      upgradeVersion: this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.SETTING }),
      versions:       this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.VERSION }),
      upgrade:        this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.UPGRADE }),
    });

    this.upgrade = res.upgrade;
  },

  data() {
    return {
      upgrade:          [],
      upgradeMessage:   [],
      errors:           '',
      selectMode:       true,
      version:          '',
      enableLogging:    true,
      readyReleaseNote: false,
      showModal:        false,
    };
  },

  computed: {
    ...mapGetters(['currentCluster']),

    latestUpgrade() {
      return this.upgrade?.find(u => u.isLatestUpgrade);
    },

    isUpgradeInProgress() {
      return this.latestUpgrade &&
        !this.latestUpgrade.isUpgradeSucceeded &&
        !this.latestUpgrade.isUpgradeFailed;
    },

    versionOptions() {
      const versions = this.$store.getters['harvester/all'](HCI.VERSION);

      return versions.map(V => V.metadata.name);
    },

    currentVersion() {
      const serverVersion = this.$store.getters['harvester/byId'](HCI.SETTING, 'server-version');

      return serverVersion.currentVersion || '';
    },

    canEnableLogging() {
      return this.$store.getters['harvester/schemaFor'](HCI.UPGRADE_LOG);
    },

    releaseLink() {
      return `https://github.com/harvester/harvester/releases/tag/${ this.version }`;
    }
  },

  watch: {
    upgrade: {
      handler(neu) {
        let upgradeMessage = [];
        const list = neu || [];

        const currentResource = list.find( O => !!O.isLatestUpgrade);

        upgradeMessage = currentResource ? currentResource.upgradeMessage : [];

        this.$set(this, 'upgradeMessage', upgradeMessage);
      },
      deep: true
    },

    version() {
      this.readyReleaseNote = false;
    }
  },

  methods: {
    async handleUpgrade() {
      const upgradeValue = {
        type:     HCI.UPGRADE,
        metadata: {
          generateName: 'hvst-upgrade-',
          namespace:    'harvester-system'
        },
        spec: { version: this.version }
      };

      if (this.canEnableLogging) {
        upgradeValue.spec.logEnabled = this.enableLogging;
      }

      const proxyResource = await this.$store.dispatch('harvester/create', upgradeValue);

      try {
        await proxyResource.save();

        this.cancel();
      } catch (err) {
        if (err?.message !== '') {
          this.errors = err.message;
        }
      }
    },

    cancel() {
      this.showModal = false;
      this.errors = '';
    },

    open() {
      this.showModal = true;
    },
  }
};
</script>

<template>
  <div v-if="currentCluster">
    <header class="header-layout header mb-0">
      <h1>
        <t
          k="harvester.dashboard.header"
          :cluster="currentCluster.nameDisplay"
        />
      </h1>
      <button
        v-if="versionOptions.length && !isUpgradeInProgress"
        type="button"
        class="btn bg-warning btn-sm"
        @click="open"
      >
        <t k="harvester.upgradePage.upgrade" />
      </button>
    </header>

    <ModalWithCard
      v-if="showModal"
      name="deleteTip"
      :width="850"
    >
      <template #title>
        <t k="harvester.upgradePage.upgradeApp" />
      </template>

      <template #content>
        <UpgradeInfo :version="version" />

        <div class="currentVersion mb-15">
          <span> <t k="harvester.upgradePage.currentVersion" /> </span>
          <span class="version">{{ currentVersion }}</span>
        </div>

        <div>
          <LabeledSelect
            v-model="version"
            class="mb-10"
            :label="t('harvester.upgradePage.versionLabel')"
            :options="versionOptions"
            :clearable="true"
          />

          <div v-if="canEnableLogging" class="mb-5">
            <Checkbox v-model="enableLogging" class="check" type="checkbox" :label="t('harvester.upgradePage.enableLogging')" />
          </div>

          <div v-if="version">
            <p v-clean-html="t('harvester.upgradePage.releaseTip', {url: releaseLink}, true)" class="mb-10"></p>

            <Checkbox v-model="readyReleaseNote" class="check" type="checkbox" label-key="harvester.upgradePage.checkReady" />
          </div>

          <Banner v-if="errors.length" color="error">
            {{ errors }}
          </Banner>
        </div>
      </template>

      <template #footer>
        <div class="footer">
          <button class="btn role-secondary mr-20" @click.prevent="cancel">
            <t k="generic.close" />
          </button>
          <button :disabled="!readyReleaseNote" class="btn role-tertiary bg-primary" @click.prevent="handleUpgrade">
            <t k="harvester.upgradePage.upgrade" />
          </button>
        </div>
      </template>
    </ModalWithCard>
  </div>
</template>

<style lang="scss" scoped>
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .footer {
    width: 100%;
    display: flex;
    justify-content: flex-end;
  }

  .banner-icon {
    display: flex;
    align-items: center;
  }

  .banner-content {
    display: flex;
  }

  .banner-message {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 0 15px;
  }

  .icon {
    font-size: 20px;
    width: 20px;
    line-height: 23px;
  }

  .currentVersion {
    margin-top: 10px;
    display: flex;
    justify-content: space-between;
    .version {
      font-size: 16px;
      font-weight: bold;
    }
  }
</style>
