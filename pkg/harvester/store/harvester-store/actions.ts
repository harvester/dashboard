import { ClusterNotFoundError } from '@shell/utils/error';
import { SETTING } from '@shell/config/settings';
import { COUNT, NAMESPACE, MANAGEMENT } from '@shell/config/types';
import { HCI } from '../../types';
import { allHash } from '@shell/utils/promise';
import { DEV } from '@shell/store/prefs';

export default {
  async loadCluster({
    state, commit, dispatch, getters, rootGetters, rootState
  }: any, { id }: any) {
    // This is a workaround for a timing issue where the mgmt cluster schema may not be available
    // Try and wait until the schema exists before proceeding
    await dispatch('management/waitForSchema', { type: MANAGEMENT.CLUSTER }, { root: true });

    // See if it really exists
    const cluster = await dispatch('management/find', {
      type: MANAGEMENT.CLUSTER,
      id,
      opt:  { url: `${ MANAGEMENT.CLUSTER }s/${ escape(id) }` }
    }, { root: true });

    let virtualBase = `/k8s/clusters/${ escape(id) }/v1/harvester`;

    if (id === 'local') {
      virtualBase = `/v1/harvester`;
    }

    if ( !cluster ) {
      commit('clusterId', null, { root: true });
      commit('applyConfig', { baseUrl: null });
      throw new ClusterNotFoundError(id);
    }

    // Update the Steve client URLs
    commit('applyConfig', { baseUrl: virtualBase });

    await Promise.all([
      dispatch('loadSchemas', true),
    ]);

    dispatch('subscribe');

    const projectArgs = {
      type: MANAGEMENT.PROJECT,
      opt:  {
        url:            `${ MANAGEMENT.PROJECT }/${ escape(id) }`,
        watchNamespace: id
      }
    };

    const fetchProjects = async() => {
      let limit = 30000;
      const sleep = 100;

      while ( limit > 0 && !rootState.managementReady ) {
        await setTimeout(() => {}, sleep);
        limit -= sleep;
      }

      if ( rootGetters['management/schemaFor'](MANAGEMENT.PROJECT) ) {
        return dispatch('management/findAll', projectArgs, { root: true });
      }
    };

    if (id !== 'local' && getters['schemaFor'](MANAGEMENT.SETTING)) { // multi-cluster
      const settings = await dispatch('findAll', {
        type: MANAGEMENT.SETTING,
        id:   SETTING.SYSTEM_NAMESPACES,
        opt:  { url: `${ virtualBase }/${ MANAGEMENT.SETTING }s/`, force: true }
      });

      const systemNamespaces = settings?.find((x: any) => x.id === SETTING.SYSTEM_NAMESPACES);

      if (systemNamespaces) {
        const namespace = (systemNamespaces.value || systemNamespaces.default)?.split(',');

        commit('setSystemNamespaces', namespace, { root: true });
      }
    }

    const hash: { [key: string]: Promise<any>} = {
      projects:          fetchProjects(),
      virtualCount:      dispatch('findAll', { type: COUNT }),
      virtualNamespaces: dispatch('findAll', { type: NAMESPACE }),
      settings:          dispatch('findAll', { type: HCI.SETTING }),
      clusters:          dispatch('management/findAll', {
        type: MANAGEMENT.CLUSTER,
        opt:  { force: true }
      }, { root: true }),
    };

    if (getters['schemaFor'](HCI.RESOURCE_QUOTA)) {
      hash.resourceQuota = dispatch('findAll', { type: HCI.RESOURCE_QUOTA });
    }

    if (getters['schemaFor'](HCI.UPGRADE)) {
      hash.upgrades = dispatch('findAll', { type: HCI.UPGRADE });
    }

    const res: any = await allHash(hash);

    await dispatch('cleanNamespaces', null, { root: true });

    commit('updateNamespaces', {
      filters: [],
      all:     getters.filterNamespace(),
      getters
    }, { root: true });

    // Solve compatibility with Rancher v2.6.x, fell remove these codes after not support v2.6.x
    const definition = {
      def:              false,
      parseJSON:        true,
      inheritFrom:      DEV,
      asUserPreference: true,
    };

    commit('prefs/setDefinition', {
      name: 'view-in-api',
      definition,
    }, { root: true });
    commit('prefs/setDefinition', {
      name: 'all-namespaces',
      definition,
    }, { root: true });
    commit('prefs/setDefinition', {
      name: 'theme-shortcut',
      definition,
    }, { root: true });
    commit('prefs/setDefinition', {
      name: 'plugin-developer',
      definition,
    }, { root: true });

    const isMultiCluster = !(res.clusters.length === 1 && res.clusters[0].metadata?.name === 'local');

    if (isMultiCluster) {
      commit('managementChanged', {
        ready:          true,
        isMultiCluster: true,
        isRancher:      true,
      }, { root: true });
    }
  },
};
