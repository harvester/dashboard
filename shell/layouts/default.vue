<script>
import debounce from 'lodash/debounce';
import { mapState, mapGetters } from 'vuex';
import {
  mapPref,
  FAVORITE_TYPES,
  AFTER_LOGIN_ROUTE,
  THEME_SHORTCUT
} from '@shell/store/prefs';
import ActionMenu from '@shell/components/ActionMenu';
import GrowlManager from '@shell/components/GrowlManager';
import WindowManager from '@shell/components/nav/WindowManager';
import PromptRemove from '@shell/components/PromptRemove';
import PromptRestore from '@shell/components/PromptRestore';
import PromptModal from '@shell/components/PromptModal';
import AssignTo from '@shell/components/AssignTo';
import Group from '@shell/components/nav/Group';
import Header from '@shell/components/nav/Header';
import Inactivity from '@shell/components/Inactivity';
import Brand from '@shell/mixins/brand';
import FixedBanner from '@shell/components/FixedBanner';
import AwsComplianceBanner from '@shell/components/AwsComplianceBanner';
import AzureWarning from '@shell/components/auth/AzureWarning';
import DraggableZone from '@shell/components/DraggableZone';
import {
  COUNT, SCHEMA, MANAGEMENT, UI, CATALOG, HCI
} from '@shell/config/types';
import { BASIC, FAVORITE, USED } from '@shell/store/type-map';
import { addObjects, replaceWith, clear, addObject } from '@shell/utils/array';
import { NAME as EXPLORER } from '@shell/config/product/explorer';
import { NAME as NAVLINKS } from '@shell/config/product/navlinks';
import { HARVESTER_NAME as HARVESTER } from '@shell/config/features';
import isEqual from 'lodash/isEqual';
import { ucFirst } from '@shell/utils/string';
import { getVersionInfo, markSeenReleaseNotes } from '@shell/utils/version';
import { sortBy } from '@shell/utils/sort';
import PageHeaderActions from '@shell/mixins/page-actions';
import BrowserTabVisibility from '@shell/mixins/browser-tab-visibility';
import { getClusterFromRoute, getProductFromRoute } from '@shell/utils/router';
import { BOTTOM } from '@shell/utils/position';
import { BLANK_CLUSTER } from '@shell/store';

const SET_LOGIN_ACTION = 'set-as-login';

export default {

  components: {
    PromptRemove,
    PromptRestore,
    AssignTo,
    PromptModal,
    Header,
    ActionMenu,
    Group,
    GrowlManager,
    WindowManager,
    FixedBanner,
    AwsComplianceBanner,
    AzureWarning,
    DraggableZone,
    Inactivity
  },

  mixins: [PageHeaderActions, Brand, BrowserTabVisibility],

  // Note - This will not run on route change
  data() {
    return {
      noLocaleShortcut: process.env.dev || false,
      groups:           [],
      gettingGroups:    false,
      wantNavSync:      false,
      unwatchPin:       undefined,
      wmPin:            null,
      draggable:        false,
    };
  },

  // Note - These will run on route change
  middleware: [
    'authenticated'
  ],

  computed: {
    ...mapState(['managementReady', 'clusterReady']),
    ...mapGetters(['productId', 'clusterId', 'namespaceMode', 'isExplorer', 'currentProduct', 'isSingleProduct', 'isRancherInHarvester', 'isVirtualCluster']),
    ...mapGetters({
      locale: 'i18n/selectedLocaleLabel', availableLocales: 'i18n/availableLocales', hasMultipleLocales: 'i18n/hasMultipleLocales'
    }),
    ...mapGetters('type-map', ['activeProducts']),

    afterLoginRoute: mapPref(AFTER_LOGIN_ROUTE),

    namespaces() {
      return this.$store.getters['activeNamespaceCache'];
    },

    themeShortcut: mapPref(THEME_SHORTCUT),
    favoriteTypes: mapPref(FAVORITE_TYPES),

    pageActions() {
      const pageActions = [];
      const product = this.$store.getters['currentProduct'];

      if ( !product ) {
        return [];
      }

      // Only show for Cluster Explorer or Global Apps (not configuration)
      const canSetAsHome = product.inStore === 'cluster' || (product.inStore === 'management' && product.category !== 'configuration') || this.isRancherInHarvester;

      if (canSetAsHome) {
        pageActions.push({
          labelKey: 'nav.header.setLoginPage',
          action:   SET_LOGIN_ACTION
        });
      }

      return pageActions;
    },

    allSchemas() {
      const managementReady = this.managementReady;
      const product = this.$store.getters['currentProduct'];

      if ( !managementReady || !product ) {
        return [];
      }

      return this.$store.getters[`${ product.inStore }/all`](SCHEMA);
    },

    allNavLinks() {
      if ( !this.clusterId || !this.$store.getters['cluster/schemaFor'](UI.NAV_LINK) ) {
        return [];
      }

      return this.$store.getters['cluster/all'](UI.NAV_LINK);
    },

    counts() {
      const managementReady = this.managementReady;
      const product = this.$store.getters['currentProduct'];

      if ( !managementReady || !product ) {
        return {};
      }

      const inStore = product.inStore;

      // So that there's something to watch for updates
      if ( this.$store.getters[`${ inStore }/haveAll`](COUNT) ) {
        const counts = this.$store.getters[`${ inStore }/all`](COUNT)[0].counts;

        return counts;
      }

      return {};
    },

    showClusterTools() {
      return this.isExplorer &&
             this.$store.getters['cluster/canList'](CATALOG.CLUSTER_REPO) &&
             this.$store.getters['cluster/canList'](CATALOG.APP);
    },

    displayVersion() {
      if (this.isSingleProduct?.getVersionInfo) {
        return this.isSingleProduct?.getVersionInfo(this.$store);
      }

      const { displayVersion } = getVersionInfo(this.$store);

      return displayVersion;
    },

    harvesterVersion() {
      return this.$store.getters['cluster/byId'](HCI.SETTING, 'server-version')?.value || 'unknown';
    },

    showProductFooter() {
      if (this.isVirtualProduct) {
        return true;
      } else {
        return false;
      }
    },

    isVirtualProduct() {
      return this.$store.getters['currentProduct'].name === HARVESTER;
    },

    supportLink() {
      const product = this.$store.getters['currentProduct'];

      if (product?.supportRoute) {
        return { ...product.supportRoute, params: { ...product.supportRoute.params, cluster: this.clusterId } };
      }

      return { name: `c-cluster-${ product?.name }-support` };
    },

    unmatchedRoute() {
      return !this.$route?.matched?.length;
    },

    /**
     * When navigation involves unloading one cluster and loading another, clusterReady toggles from true->false->true in middleware (before new route content renders)
     * Prevent rendering "outlet" until the route changes to avoid re-rendering old route content after its cluster is unloaded
     */
    clusterAndRouteReady() {
      const targetRoute = this.$store.getters['targetRoute'];
      const routeReady = targetRoute ? this.currentProduct?.name === getProductFromRoute(this.$route) && this.currentProduct?.name === getProductFromRoute(targetRoute) : this.currentProduct?.name === getProductFromRoute(this.$route);

      return this.clusterReady &&
        this.clusterId === getClusterFromRoute(this.$route) && routeReady;
    },

    pinClass() {
      return `pin-${ this.wmPin }`;
    },

  },

  watch: {
    counts(a, b) {
      if ( a !== b ) {
        this.queueUpdate();
      }
    },

    allSchemas(a, b) {
      if ( a !== b ) {
        this.queueUpdate();
      }
    },

    allNavLinks(a, b) {
      if ( a !== b ) {
        this.queueUpdate();
      }
    },

    favoriteTypes(a, b) {
      if ( !isEqual(a, b) ) {
        this.queueUpdate();
      }
    },

    locale(a, b) {
      if ( !isEqual(a, b) ) {
        this.getGroups();
      }
    },

    productId(a, b) {
      if ( !isEqual(a, b) ) {
        // Immediately update because you'll see it come in later
        this.getGroups();
      }
    },

    clusterId(a, b) {
      if ( !isEqual(a, b) ) {
        // Store the last visited route when the cluster changes
        this.setClusterAsLastRoute();
      }
    },

    namespaceMode(a, b) {
      if ( !isEqual(a, b) ) {
        // Immediately update because you'll see it come in later
        this.getGroups();
      }
    },

    namespaces(a, b) {
      if ( !isEqual(a, b) ) {
        // Immediately update because you'll see it come in later
        this.getGroups();
      }
    },

    clusterReady(a, b) {
      if ( !isEqual(a, b) ) {
        // Immediately update because you'll see it come in later
        this.getGroups();
      }
    },

    product(a, b) {
      if ( !isEqual(a, b) ) {
        // Immediately update because you'll see it come in later
        this.getGroups();
      }
    },

    async currentProduct(a, b) {
      if ( !isEqual(a, b) ) {
        if ((a.inStore !== b.inStore || a.inStore !== 'cluster') && this.clusterId && a.name) {
          const route = {
            name:   'c-cluster-product',
            params: {
              cluster: this.clusterId,
              product: a.name,
            }
          };

          await this.$store.dispatch('prefs/setLastVisited', route);
        }
      }
    },

    $route(a, b) {
      this.$nextTick(() => this.syncNav());
    },

  },

  async created() {
    this.queueUpdate = debounce(this.getGroups, 500);

    this.getGroups();

    await this.$store.dispatch('prefs/setLastVisited', this.$route);
  },

  mounted() {
    // Sync the navigation tree on fresh load
    this.$nextTick(() => this.syncNav());

    this.wmPin = window.localStorage.getItem('wm-pin') || BOTTOM;

    // two-way binding this.wmPin <-> draggableZone.pin
    this.$refs.draggableZone.pin = this.wmPin;
    this.unwatchPin = this.$watch('$refs.draggableZone.pin', (pin) => {
      this.wmPin = pin;
    });
  },

  unmounted() {
    this.unwatchPin();
  },

  methods: {
    async setClusterAsLastRoute() {
      if (!this.clusterId || this.clusterId === BLANK_CLUSTER) {
        return;
      }
      const route = {
        name:   this.$route.name,
        params: {
          ...this.$route.params,
          cluster: this.clusterId,
        }
      };

      await this.$store.dispatch('prefs/setLastVisited', route);
    },

    handlePageAction(action) {
      if (action.action === SET_LOGIN_ACTION) {
        this.afterLoginRoute = this.getLoginRoute();
        // Mark release notes as seen, so that the login route is honoured
        markSeenReleaseNotes(this.$store);
      }
    },

    getLoginRoute() {
      return {
        name:   this.$route.name,
        params: this.$route.params
      };
    },

    collapseAll() {
      this.$refs.groups.forEach((grp) => {
        grp.isExpanded = false;
      });
    },

    getProductsGroups(out, loadProducts, namespaceMode, namespaces, productMap) {
      const clusterId = this.$store.getters['clusterId'];
      const currentType = this.$route.params.resource || '';

      for ( const productId of loadProducts ) {
        const modes = [BASIC];

        if ( productId === NAVLINKS ) {
          // Navlinks produce their own top-level nav items so don't need to show it as a product.
          continue;
        }

        if ( productId === EXPLORER ) {
          modes.push(FAVORITE);
          modes.push(USED);
        }

        for ( const mode of modes ) {
          const types = this.$store.getters['type-map/allTypes'](productId, mode) || {};

          const more = this.$store.getters['type-map/getTree'](productId, mode, types, clusterId, namespaceMode, namespaces, currentType);

          if ( productId === EXPLORER || !this.isExplorer ) {
            addObjects(out, more);
          } else {
            const root = more.find(x => x.name === 'root');
            const other = more.filter(x => x.name !== 'root');

            const group = {
              name:     productId,
              label:    this.$store.getters['i18n/withFallback'](`product.${ productId }`, null, ucFirst(productId)),
              children: [...(root?.children || []), ...other],
              weight:   productMap[productId]?.weight || 0,
            };

            addObject(out, group);
          }
        }
      }
    },

    getExplorerGroups(out) {
      if ( this.isExplorer ) {
        const allNavLinks = this.allNavLinks;
        const toAdd = [];
        const haveGroup = {};

        for ( const obj of allNavLinks ) {
          if ( !obj.link ) {
            continue;
          }

          const groupLabel = obj.spec.group;
          const groupSlug = obj.normalizedGroup;

          const entry = {
            name:        `link-${ obj._key }`,
            link:        obj.link,
            target:      obj.actualTarget,
            label:       obj.labelDisplay,
            sideLabel:   obj.spec.sideLabel,
            iconSrc:     obj.spec.iconSrc,
            description: obj.spec.description,
          };

          // If there's a spec.group (groupLabel), all entries with that name go under one nav group
          if ( groupSlug ) {
            if ( haveGroup[groupSlug] ) {
              continue;
            }

            haveGroup[groupSlug] = true;

            toAdd.push({
              name:     `navlink-group-${ groupSlug }`,
              label:    groupLabel,
              isRoot:   true,
              // This is the item that actually shows up in the nav, since this outer group will be invisible
              children: [
                {
                  name:  `navlink-child-${ groupSlug }`,
                  label: groupLabel,
                  route: {
                    name:   'c-cluster-navlinks-group',
                    params: {
                      cluster: this.clusterId,
                      group:   groupSlug,
                    }
                  },
                }
              ],
              weight: -100,
            });
          } else {
            toAdd.push({
              name:     `navlink-${ entry.name }`,
              label:    entry.label,
              isRoot:   true,
              // This is the item that actually shows up in the nav, since this outer group will be invisible
              children: [entry],
              weight:   -100,
            });
          }
        }

        addObjects(out, toAdd);
      }
    },

    /**
     * Fetch navigation by creating groups from product schemas
     */
    getGroups() {
      if ( this.gettingGroups ) {
        return;
      }
      this.gettingGroups = true;

      if ( !this.clusterReady ) {
        clear(this.groups);
        this.gettingGroups = false;

        return;
      }

      const currentProduct = this.$store.getters['productId'];
      let namespaces = null;

      if ( !this.$store.getters['isAllNamespaces'] ) {
        const namespacesObject = this.$store.getters['namespaces']();

        namespaces = Object.keys(namespacesObject);
      }

      // Always show cluster-level types, regardless of the namespace filter
      const namespaceMode = 'both';
      const out = [];
      const loadProducts = this.isExplorer ? [EXPLORER] : [];

      const productMap = this.activeProducts.reduce((acc, p) => {
        return { ...acc, [p.name]: p };
      }, {});

      if ( this.isExplorer ) {
        for ( const product of this.activeProducts ) {
          if ( product.inStore === 'cluster' ) {
            addObject(loadProducts, product.name);
          }
        }
      }

      // This should already have come into the list from above, but in case it hasn't...
      addObject(loadProducts, currentProduct);

      this.getProductsGroups(out, loadProducts, namespaceMode, namespaces, productMap);
      this.getExplorerGroups(out);

      replaceWith(this.groups, ...sortBy(out, ['weight:desc', 'label']));
      this.gettingGroups = false;
    },

    toggleNoneLocale() {
      this.$store.dispatch('i18n/toggleNone');
    },

    toggleTheme() {
      this.$store.dispatch('prefs/toggleTheme');
    },

    groupSelected(selected) {
      this.$refs.groups.forEach((grp) => {
        if (grp.canCollapse) {
          grp.isExpanded = (grp.group.name === selected.name);
        }
      });
    },

    wheresMyDebugger() {
      // vue-shortkey is preventing F8 from passing through to the browser... this works for now.
      // eslint-disable-next-line no-debugger
      debugger;
    },

    async toggleShell() {
      const clusterId = this.$route.params.cluster;

      if ( !clusterId ) {
        return;
      }

      const cluster = await this.$store.dispatch('management/find', {
        type: MANAGEMENT.CLUSTER,
        id:   clusterId,
      });

      if (!cluster ) {
        return;
      }

      cluster.openShell();
    },

    syncNav() {
      const refs = this.$refs.groups;

      if (refs) {
        // Only expand one group - so after the first has been expanded, no more will
        // This prevents the 'More Resources' group being expanded in addition to the normal group
        let canExpand = true;
        const expanded = refs.filter(grp => grp.isExpanded)[0];

        if (expanded && expanded.hasActiveRoute()) {
          this.$nextTick(() => expanded.syncNav());

          return;
        }
        refs.forEach((grp) => {
          if (!grp.group.isRoot) {
            grp.isExpanded = false;
            if (canExpand) {
              const isActive = grp.hasActiveRoute();

              if (isActive) {
                grp.isExpanded = true;
                canExpand = false;
                this.$nextTick(() => grp.syncNav());
              }
            }
          }
        });
      }
    },

    switchLocale(locale) {
      this.$store.dispatch('i18n/switchTo', locale);
    },
  }
};
</script>

<template>
  <div class="dashboard-root">
    <FixedBanner :header="true" />
    <AwsComplianceBanner v-if="managementReady" />
    <AzureWarning v-if="managementReady" />
    <div
      v-if="managementReady"
      class="dashboard-content"
      :class="{[pinClass]: true}"
    >
      <Header />
      <nav
        v-if="clusterReady"
        class="side-nav"
      >
        <div class="nav">
          <template v-for="(g) in groups">
            <Group
              ref="groups"
              :key="g.name"
              id-prefix=""
              class="package"
              :group="g"
              :can-collapse="!g.isRoot"
              :show-header="!g.isRoot"
              @selected="groupSelected($event)"
              @expand="groupSelected($event)"
            />
          </template>
        </div>
        <n-link
          v-if="showClusterTools"
          tag="div"
          class="tools"
          :to="{name: 'c-cluster-explorer-tools', params: {cluster: clusterId}}"
        >
          <a
            class="tools-button"
            @click="collapseAll()"
          >
            <i class="icon icon-gear" />
            <span>{{ t('nav.clusterTools') }}</span>
          </a>
        </n-link>
        <div
          v-if="showProductFooter"
          class="footer"
        >
          <nuxt-link
            :to="supportLink"
            class="pull-right"
          >
            {{ t('nav.support', {hasSupport: true}) }}
          </nuxt-link>

          <span
            v-clean-tooltip="{content: displayVersion, placement: 'top'}"
            class="clip version text-muted"
          >
            {{ displayVersion }}
          </span>
          <span v-if="isSingleProduct">
            <v-popover
              v-if="hasMultipleLocales"
              popover-class="localeSelector"
              placement="top"
              trigger="click"
            >
              <a
                data-testid="locale-selector"
                class="locale-chooser"
              >
                {{ locale }}
              </a>

              <template slot="popover">
                <ul
                  class="list-unstyled dropdown"
                  style="margin: -1px;"
                >
                  <li
                    v-for="(label, name) in availableLocales"
                    :key="name"
                    class="hand"
                    @click="switchLocale(name)"
                  >
                    {{ label }}
                  </li>
                </ul>
              </template>
            </v-popover>
          </span>
        </div>
        <div
          v-else
          class="version text-muted flex"
        >
          <span>{{ displayVersion }}</span>
          <span
            v-if="isVirtualCluster && isExplorer"
            v-clean-tooltip="{content: harvesterVersion, placement: 'top'}"
            class="clip text-muted ml-5"
          >
            (Harvester-{{ harvesterVersion }})
          </span>
        </div>
      </nav>
      <main
        v-if="clusterAndRouteReady"
        class="main-layout"
      >
        <nuxt class="outlet" />
        <ActionMenu />
        <PromptRemove />
        <PromptRestore />
        <AssignTo />
        <PromptModal />
        <button
          v-if="noLocaleShortcut"
          v-shortkey.once="['shift','l']"
          class="hide"
          @shortkey="toggleNoneLocale()"
        />
        <button
          v-if="themeShortcut"
          v-shortkey.once="['shift','t']"
          class="hide"
          @shortkey="toggleTheme()"
        />
        <button
          v-shortkey.once="['f8']"
          class="hide"
          @shortkey="wheresMyDebugger()"
        />
        <button
          v-shortkey.once="['`']"
          class="hide"
          @shortkey="toggleShell"
        />
      </main>
      <!-- Ensure there's an outlet to show the error (404) page -->
      <main
        v-else-if="unmatchedRoute"
        class="main-layout"
      >
        <nuxt class="outlet" />
      </main>
      <div
        v-if="$refs.draggableZone"
        class="wm"
        :class="{
          'drag-end': !$refs.draggableZone.drag.active,
          'drag-start': $refs.draggableZone.drag.active,
        }"
        :draggable="draggable"
        @dragstart="$refs.draggableZone.onDragStart($event)"
        @dragend="$refs.draggableZone.onDragEnd($event)"
      >
        <WindowManager @draggable="draggable=$event" />
      </div>
    </div>
    <FixedBanner :footer="true" />
    <GrowlManager />
    <Inactivity />
    <DraggableZone ref="draggableZone" />
  </div>
</template>
<style lang="scss" scoped>
  .side-nav {
    display: flex;
    flex-direction: column;
    .nav {
      flex: 1;
      overflow-y: auto;
    }
  }

  .flex {
    display: flex;
  }
</style>
<style lang="scss">
  .dashboard-root {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  .dashboard-content {
    display: grid;
    position: relative;
    flex: 1 1 auto;
    overflow-y: auto;
    min-height: 0px;

    &.pin-right {
      grid-template-areas:
        "header  header  header"
        "nav      main     wm";
      grid-template-rows:    var(--header-height) auto;
      grid-template-columns: var(--nav-width)     auto var(--wm-width, 0px);
    }

    &.pin-bottom {
      grid-template-areas:
        "header  header"
        "nav       main"
        "wm         wm";
      grid-template-rows:    var(--header-height) auto  var(--wm-height, 0px);
      grid-template-columns: var(--nav-width)     auto;
    }

    &.pin-left {
      grid-template-areas:
        "header  header  header"
        "wm       nav     main";
      grid-template-rows:    var(--header-height) auto;
      grid-template-columns: var(--wm-width, 0px) var(--nav-width) auto;
    }

    > HEADER {
      grid-area: header;
    }

    NAV {
      grid-area: nav;
      position: relative;
      background-color: var(--nav-bg);
      border-right: var(--nav-border-size) solid var(--nav-border);
      overflow-y: auto;

      H6, .root.child .label {
        margin: 0;
        letter-spacing: normal;
        line-height: initial;

        A { padding-left: 0; }
      }

      .root.child A{
        padding: 7.5px 7px 7.5px 8px;
      }
    }

    NAV .tools {
      display: flex;
      margin: 10px;
      text-align: center;

      A {
        align-items: center;
        border: 1px solid var(--border);
        border-radius: 5px;
        color: var(--body-text);
        display: flex;
        justify-content: center;
        outline: 0;
        flex: 1;
        padding: 10px;

        &:hover {
          background: var(--nav-hover);
          text-decoration: none;
        }

        > I {
          margin-right: 4px;
        }
      }

      &.nuxt-link-active:not(:hover) {
        A {
          background-color: var(--nav-active);
        }
      }
    }

    NAV .version {
      cursor: default;
      margin: 0 10px 10px 10px;
    }

    NAV .footer {
      margin: 20px;
      display: flex;
      flex: 0;
      flex-direction: row;

      > * {
        flex: 1;
        color: var(--link);

        &:last-child {
          text-align: right;
        }

        &:first-child {
          text-align: left;
        }

        text-align: center;
      }

      .version {
        cursor: default;
        margin: 0px;
      }

      .locale-chooser {
        cursor: pointer;
      }
    }
  }

  .wm {
    grid-area: wm;
    overflow-y: hidden;
    z-index: 1;
  }

  .localeSelector {
    ::v-deep .popover-inner {
      padding: 50px 0;
    }

    ::v-deep .popover-arrow {
      display: none;
    }

    ::v-deep .popover:focus {
      outline: 0;
    }

    li {
      padding: 8px 20px;

      &:hover {
        background-color: var(--primary-hover-bg);
        color: var(--primary-hover-text);
        text-decoration: none;
      }
    }
  }

  .drag-start {
    z-index: 1000;
    opacity: 0.5;
    transition: opacity .3s ease;
  }

  .drag-end {
    opacity: 1;
  }
</style>
