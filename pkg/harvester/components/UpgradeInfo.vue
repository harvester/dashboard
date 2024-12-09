<script>
import { Banner } from '@components/Banner';
<<<<<<< HEAD
=======
import { DOC_LINKS } from '../config/doc-links';
>>>>>>> b5455bcb (fix: separate used/allocated units)

export default {
  name: 'HarvesterUpgradeInfo',

  components: { Banner },

  props: {
    version: {
      type:    String,
      default: ''
    }
  },

  computed: {
    releaseVersion() {
      return !!this.version ? `https://github.com/harvester/harvester/releases/tag/${ this.version }` : `https://github.com/harvester/harvester/releases`;
<<<<<<< HEAD
=======
    },

    upgradeLink() {
      return DOC_LINKS.UPGRADE_URL;
>>>>>>> b5455bcb (fix: separate used/allocated units)
    }
  },
};
</script>

<template>
  <div>
    <Banner color="warning">
      <div>
        <strong>{{ t('harvester.upgradePage.upgradeInfo.warning') }}:</strong>
<<<<<<< HEAD
        <p v-clean-html="t('harvester.upgradePage.upgradeInfo.doc', {}, true)" class="mb-5">
        </p>
=======
        <p v-clean-html="t('harvester.upgradePage.upgradeInfo.doc', {url: upgradeLink}, true)" class="mb-5"></p>
>>>>>>> b5455bcb (fix: separate used/allocated units)

        <p class="mb-5">
          {{ t('harvester.upgradePage.upgradeInfo.tip') }}
        </p>

        <p class="mb-5">
<<<<<<< HEAD
          {{ t('harvester.upgradePage.upgradeInfo.moreNotes') }} <a :href="releaseVersion" target="_blank">{{ t('generic.moreInfo') }} </a>
=======
          {{ t('harvester.upgradePage.upgradeInfo.moreNotes') }} <a :href="releaseVersion" target="_blank">{{ t('generic.moreInfo') }}</a>
>>>>>>> b5455bcb (fix: separate used/allocated units)
        </p>
      </div>
    </Banner>
  </div>
</template>
