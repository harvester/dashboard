<script>
import jsyaml from 'js-yaml';
import { allHash } from '@shell/utils/promise';
import { Banner } from '@components/Banner';
import MessageLink from '@shell/components/MessageLink';
import ResourceTable from '@shell/components/ResourceTable';
import Loading from '@shell/components/Loading';

import { SCHEMA, MONITORING } from '@shell/config/types';
import { HCI } from '../types';

const schema = {
  id:         HCI.ALERTMANAGERCONFIG,
  type:       SCHEMA,
  attributes: {
    kind:       HCI.ALERTMANAGERCONFIG,
    namespaced: true
  },
  metadata: { name: HCI.ALERTMANAGERCONFIG },
};

const MONITORING_ID = 'cattle-monitoring-system/rancher-monitoring';

export default {
  name:       'ListAlertManagerConfigs',
  components: {
    Banner, Loading, ResourceTable, MessageLink
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;
    const _hash = { rows: this.$store.dispatch(`${ inStore }/findAll`, { type: MONITORING.ALERTMANAGERCONFIG }) };

    if (this.$store.getters[`${ inStore }/schemaFor`](HCI.ADD_ONS )) {
      _hash.monitoring = this.$store.dispatch(`${ inStore }/find`, { type: HCI.ADD_ONS, id: MONITORING_ID });
    }

    const hash = await allHash(_hash);

    this.rows = hash.rows;
    this.monitoringAddon = hash.monitoring;

    const configSchema = this.$store.getters[`${ inStore }/schemaFor`](MONITORING.ALERTMANAGERCONFIG);

    this.$store.dispatch('type-map/configureType', { match: HCI.ALERTMANAGERCONFIG, isCreatable: configSchema?.collectionMethods.find(x => x.toLowerCase() === 'post') });
  },

  data() {
    return { rows: null, monitoringAddon: null };
  },

  computed: {
    schema() {
      return schema;
    },

    to() {
      return `${ HCI.ADD_ONS }/cattle-monitoring-system/rancher-monitoring?mode=edit#alertmanager`;
    },

    monitoringEnabled() {
      return this.monitoringAddon?.spec?.enabled;
    },

    alertingEnabled() {
      const valueJson = jsyaml.load(this.monitoringAddon?.spec?.valuesContent);

      return valueJson?.alertmanager?.enabled;
    },
  },

  typeDisplay() {
    return this.$store.getters['type-map/labelFor'](schema, 99);
  }
};
</script>

<template>
  <Loading v-if="$fetchState.pending" />
  <div v-else>
    <Banner v-if="monitoringEnabled === false" color="info">
      <MessageLink
        :to="to"
        prefix-label="harvester.monitoring.alertmanagerConfig.diabledMonitoringTips.prefix"
        middle-label="harvester.monitoring.alertmanagerConfig.diabledMonitoringTips.middle"
        suffix-label="harvester.monitoring.alertmanagerConfig.diabledMonitoringTips.suffix"
      />
    </Banner>
    <Banner v-if="alertingEnabled === false" color="info">
      <MessageLink
        :to="to"
        prefix-label="harvester.monitoring.alertmanagerConfig.diabledAlertingTips.prefix"
        middle-label="harvester.monitoring.alertmanagerConfig.diabledAlertingTips.middle"
        suffix-label="harvester.monitoring.alertmanagerConfig.diabledAlertingTips.suffix"
      />
    </Banner>
    <Banner color="info">
      {{ t('monitoring.alertmanagerConfig.description') }}
    </Banner>
    <ResourceTable
      v-bind="$attrs"
      :groupable="true"
      :schema="schema"
      :rows="rows"
      key-field="_key"
      v-on="$listeners"
    />
  </div>
</template>

<style lang="scss" scoped>
.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  margin-top: 6em;
  min-height: 100%;
}

i {
  font-size: 10em;
  opacity: 50%;
  margin: 0;
}

h2 {
  margin: 0;
}

h3 {
  margin-top: 2em;
}

</style>
