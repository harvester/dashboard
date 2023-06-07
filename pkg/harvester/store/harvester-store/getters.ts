import {
  NAMESPACE_FILTER_SPECIAL as SPECIAL,
  NAMESPACE_FILTER_ALL as ALL,
  NAMESPACE_FILTER_ALL_ORPHANS as ALL_ORPHANS,
} from '@shell/utils/namespace-filter';
import { MANAGEMENT } from '@shell/config/types';
import { sortBy } from '@shell/utils/sort';
import { filterBy } from '@shell/utils/array';

export default {
  namespaceFilterOptions: (state: any, getters: any, rootState: any, rootGetters: any) => ({
    addNamespace,
    divider,
    notFilterNamespaces
  }: any) => {
    const out = [{
      id:    ALL,
      kind:  SPECIAL,
      label: rootGetters['i18n/t']('nav.ns.all'),
    }];

    divider(out);

    const namespaces = getters.filterNamespace(notFilterNamespaces);

    if (!rootGetters['isStandaloneHarvester'] && rootGetters['currentCluster'] && rootGetters['currentCluster']?.id !== '_') {
      const cluster = rootGetters['currentCluster'];
      let projects = rootGetters['management/all'](
        MANAGEMENT.PROJECT
      );

      projects = sortBy(filterBy(projects, 'spec.clusterName', cluster.id), [
        'nameDisplay',
      ]).filter((project: any) => project.nameDisplay !== 'System');

      const projectsById: any = {};
      const namespacesByProject: any = {};
      let firstProject = true;

      namespacesByProject['null'] = []; // For namespaces not in a project
      for (const project of projects) {
        projectsById[project.metadata.name] = project;
      }

      for (const namespace of namespaces) {
        let projectId = namespace.projectId;

        if (!projectId || !projectsById[projectId]) {
          // If there's a projectId but that project doesn't exist, treat it like no project
          projectId = 'null';
        }

        let entry = namespacesByProject[projectId];

        if (!entry) {
          entry = [];
          namespacesByProject[namespace.projectId] = entry;
        }
        entry.push(namespace);
      }

      for (const project of projects) {
        const id = project.metadata.name;

        if (firstProject) {
          firstProject = false;
        } else {
          divider(out);
        }

        out.push({
          id:    `project://${ id }`,
          kind:  'project',
          label: project.nameDisplay,
        });

        const forThisProject = namespacesByProject[id] || [];

        addNamespace(out, forThisProject);
      }

      const orphans = namespacesByProject['null'];

      if (orphans.length) {
        if (!firstProject) {
          divider(out);
        }

        out.push({
          id:    ALL_ORPHANS,
          kind:  'project',
          label: rootGetters['i18n/t']('nav.ns.orphan'),
        });

        addNamespace(out, orphans);
      }
    } else {
      addNamespace(out, namespaces);
    }

    return out;
  },

  /**
   * filter system/fleet/cattle namespace
   */
  filterNamespace(state: any, getters: any, rootState: any, rootGetters: any, action: any) {
    const allNamespaces = getters.all('namespace');

    return (notFilterNamespaces: any = []) => {
      return allNamespaces.filter((namespace: any) => {
        return !namespace.isSystem || notFilterNamespaces.includes(namespace.id);
      });
    };
  },

  filterProject(state: any, getters: any, rootState: any, rootGetters: any) {
    const projectsInAllClusters = rootGetters['management/all'](
      MANAGEMENT.PROJECT
    );
    const currentCluster = rootGetters['currentCluster'];
    const clusterId = currentCluster.id;

    return projectsInAllClusters.filter((project: any) => project.spec.clusterName === clusterId && project.nameDisplay !== 'System');
  }
};
