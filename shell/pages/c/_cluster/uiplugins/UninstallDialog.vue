<script>
import { mapGetters } from 'vuex';
import AppModal from '@shell/components/AppModal.vue';
import AsyncButton from '@shell/components/AsyncButton';
import { CATALOG, SERVICE, WORKLOAD_TYPES } from '@shell/config/types';
import { UI_PLUGIN_LABELS, UI_PLUGIN_NAMESPACE } from '@shell/config/uiplugins';
import { allHash } from '@shell/utils/promise';

export default {
  components: { AsyncButton, AppModal },

  data() {
    return { plugin: undefined, busy: false };
  },

  computed: { ...mapGetters({ allCharts: 'catalog/charts' }) },

  methods: {
    showDialog(plugin) {
      this.plugin = plugin;
      this.busy = false;
      this.showModal = true;
    },
    closeDialog(result) {
      this.showModal = false;
      this.$emit('closed', result);
    },
    async uninstall() {
      this.busy = true;

      const plugin = this.plugin;

      this.$emit('update', plugin.name, 'uninstall');

      // Delete the CR if this is a developer plugin (there is no Helm App, so need to remove the CRD ourselves)
      if (plugin.uiplugin?.isDeveloper || (plugin.catalog && plugin.uiplugin)) {
        // Delete the custom resource
        await plugin.uiplugin.remove();
      }

      // Find the app for this plugin
      const apps = await this.$store.dispatch('management/findAll', { type: CATALOG.APP });

      const pluginApps = apps.filter((app) => {
        if (plugin.catalog && app.namespace === UI_PLUGIN_NAMESPACE) {
          // Find the related apps from the deployed helm repository
          const charts = this.allCharts.filter(chart => chart.repoName === plugin.repo?.metadata?.name);

          return charts.some(chart => chart.chartName === app.metadata.name);
        }

        if (app.namespace === UI_PLUGIN_NAMESPACE && app.name === plugin.name) {
          return app;
        }

        return false;
      });

      if (plugin.catalog) {
        await this.removePluginImageResources(plugin.uiplugin);
      }

      if (pluginApps.length) {
        try {
          pluginApps.forEach(app => app.remove());
        } catch (e) {
          this.$store.dispatch('growl/error', {
            title:   this.t('plugins.error.generic'),
            message: e.message ? e.message : e,
            timeout: 10000
          }, { root: true });
        }

        await this.$store.dispatch('management/findAll', { type: CATALOG.OPERATION });
      }

      this.closeDialog(plugin);
    },
    async removePluginImageResources(plugin) {
      const selector = `${ UI_PLUGIN_LABELS.CATALOG_IMAGE }=${ plugin.metadata?.labels?.[UI_PLUGIN_LABELS.CATALOG_IMAGE] }`;
      const namespace = UI_PLUGIN_NAMESPACE;

      if (selector) {
        const hash = await allHash({
          deployment: this.$store.dispatch('management/findMatching', {
            type: WORKLOAD_TYPES.DEPLOYMENT, selector, namespace
          }),
          service: this.$store.dispatch('management/findMatching', {
            type: SERVICE, selector, namespace
          }),
          repo: this.$store.dispatch('management/findMatching', { type: CATALOG.CLUSTER_REPO, selector })
        });

        for (const resource of Object.keys(hash)) {
          if (hash[resource]) {
            hash[resource].forEach(r => r.remove());
          }
        }
      }
    }
  }
};
</script>

<template>
  <app-modal
    v-if="showModal"
    name="uninstallPluginDialog"
    height="auto"
    :scrollable="true"
    @close="closeDialog(false)"
  >
    <div
      v-if="plugin"
      class="plugin-install-dialog"
    >
      <h4 class="mt-10">
        {{ t('plugins.uninstall.title', { name: plugin.label }) }}
      </h4>
      <div class="mt-10 dialog-panel">
        <div class="dialog-info">
          <p>
            {{ plugin.catalog ? t('plugins.uninstall.custom') : t('plugins.uninstall.prompt') }}
          </p>
        </div>
        <div class="dialog-buttons">
          <button
            :disabled="busy"
            class="btn role-secondary"
            data-testid="uninstall-ext-modal-cancel-btn"
            @click="closeDialog(false)"
          >
            {{ t('generic.cancel') }}
          </button>
          <AsyncButton
            mode="uninstall"
            data-testid="uninstall-ext-modal-uninstall-btn"
            @click="uninstall()"
          />
        </div>
      </div>
    </div>
  </app-modal>
</template>

<style lang="scss" scoped>
  .plugin-install-dialog {
    padding: 10px;

    h4 {
      font-weight: bold;
    }

    .dialog-panel {
      display: flex;
      flex-direction: column;
      min-height: 100px;

      .dialog-info {
        flex: 1;
      }
    }

    .dialog-buttons {
      display: flex;
      justify-content: flex-end;
      margin-top: 10px;

      > *:not(:last-child) {
        margin-right: 10px;
      }
    }
  }
</style>
