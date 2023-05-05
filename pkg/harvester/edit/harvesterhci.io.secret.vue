<script>
import { SECRET_TYPES as TYPES } from '@shell/config/secret';
import { MANAGEMENT, NAMESPACE, DEFAULT_WORKSPACE } from '@shell/config/types';
import CreateEditView from '@shell/mixins/create-edit-view';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import { LabeledInput } from '@components/Form/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import CruResource from '@shell/components/CruResource';
import {
  CLOUD_CREDENTIAL, _CLONE, _CREATE, _EDIT, _FLAGGED
} from '@shell/config/query-params';
import Loading from '@shell/components/Loading';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import Labels from '@shell/components/form/Labels';
import { HIDE_SENSITIVE, LAST_NAMESPACE } from '@shell/store/prefs';
import { CAPI } from '@shell/config/labels-annotations';
import { clear } from '@shell/utils/array';
import { importCloudCredential } from '@shell/utils/dynamic-importer';
import SelectIconGrid from '@shell/components/SelectIconGrid';
import { ucFirst } from '@shell/utils/string';

export default {
  name: 'CruSecret',

  components: {
    LabeledInput,
    LabeledSelect,
    Loading,
    NameNsDescription,
    CruResource,
    Tabbed,
    Tab,
    Labels,
    SelectIconGrid
  },

  mixins: [CreateEditView],

  async fetch() {
    if ( this.isCloud ) {
      this.nodeDrivers = await this.$store.dispatch('management/findAll', { type: MANAGEMENT.NODE_DRIVER });
    }
  },

  data() {
    const newCloudCred = this.$route.query[CLOUD_CREDENTIAL] === _FLAGGED;
    const editCloudCred = this.mode === _EDIT && this.value._type === TYPES.CLOUD_CREDENTIAL;
    const cloneCloudCred = this.realMode === _CLONE && this.liveValue._type === TYPES.CLOUD_CREDENTIAL;
    const isCloud = newCloudCred || editCloudCred || cloneCloudCred;

    if ( newCloudCred ) {
      this.value.metadata.namespace = DEFAULT_WORKSPACE;

      this.$set(this.value.metadata, 'name', '');

      this.$set(this.value, 'data', {});
    }

    const secretTypes = [
      {
        label: 'Custom',
        value: 'custom'
      },
      {
        label:    'divider',
        disabled: true,
        kind:     'divider'
      }
    ];

    Object.values(TYPES).forEach((t) => {
      secretTypes.push({
        label: t,
        value: t
      });
    });

    if ( this.mode === _CREATE ) {
      this.$set(this.value, '_type', TYPES.OPAQUE);
    }

    return {
      isCloud,
      nodeDrivers:       null,
      secretTypes,
      secretType:        this.value._type,
      initialSecretType: this.value._type
    };
  },

  computed: {
    typeKey() {
      if ( this.isCloud ) {
        return 'cloud';
      }

      switch ( this.value._type ) {
      case TYPES.TLS: return 'tls';
      case TYPES.BASIC: return 'basic';
      case TYPES.DOCKER_JSON: return 'registry';
      case TYPES.SSH: return 'ssh';
      }

      return 'generic';
    },

    dataComponent() {
      return require(`@shell/edit/secret/${ this.typeKey }`).default;
    },

    driverName() {
      const driver = this.value.metadata?.annotations?.[CAPI.CREDENTIAL_DRIVER];

      return driver;
    },

    cloudComponent() {
      const driver = this.driverName;
      const haveProviders = this.$store.getters['plugins/credentialDrivers'];

      if ( haveProviders.includes(driver) ) {
        return importCloudCredential(driver);
      }

      return importCloudCredential('generic');
    },

    namespaces() {
      return this.$store.getters['cluster/all'](NAMESPACE).map((obj) => {
        return {
          label: obj.nameDisplay,
          value: obj.id,
        };
      });
    },

    hideSensitiveData() {
      return this.$store.getters['prefs/get'](HIDE_SENSITIVE);
    },

    dataLabel() {
      switch (this.value._type) {
      case TYPES.TLS:
        return this.t('secret.certificate.certificate');
      case TYPES.SSH:
        return this.t('secret.ssh.keys');
      case TYPES.BASIC:
        return this.t('secret.authentication');
      default:
        return this.t('secret.data');
      }
    },
  },

  created() {
    this.registerAfterHook(() => {
      const allNamespaces = this.$store.getters['allNamespaces'];
      const defaultNamepsace = allNamespaces.find(N => N.id === 'default');
      const ns = defaultNamepsace?.id || allNamespaces?.[0]?.id || '';

      this.value.$dispatch('prefs/set', { key: LAST_NAMESPACE, value: ns }, { root: true });
    });
  },

  methods: {
    async saveSecret(btnCb) {
      if ( this.errors ) {
        clear(this.errors);
      }

      if ( typeof this.$refs.cloudComponent?.test === 'function' ) {
        try {
          const res = await this.$refs.cloudComponent.test();

          if ( !res || res?.errors) {
            if (res?.errors) {
              this.errors = res.errors;
            } else {
              this.errors = ['Authentication test failed, please check your credentials'];
            }
            btnCb(false);

            return;
          }
        } catch (e) {
          this.errors = [e];
          btnCb(false);

          return;
        }
      }

      return this.save(btnCb);
    },

    typeDisplay(type, driver) {
      if ( type === CAPI.CREDENTIAL_DRIVER ) {
        return this.$store.getters['i18n/withFallback'](`cluster.provider."${ driver }"`, null, driver);
      } else {
        const fallback = type.replace(/^kubernetes.io\//, '');

        return this.$store.getters['i18n/withFallback'](`secret.types."${ type }"`, null, fallback);
      }
    },

    initialDisplayFor(type) {
      const fallback = (ucFirst(this.typeDisplay(type) || '').replace(/[^A-Z]/g, '') || type).substr(0, 3);

      return this.$store.getters['i18n/withFallback'](`secret.initials."${ type }"`, null, fallback);
    },

    selectCustomType(type) {
      if (type !== 'custom') {
        this.$set(this.value, '_type', type);
      }
    }
  },
};
</script>

<template>
  <form class="filled-height">
    <Loading v-if="$fetchState.pending" />
    <CruResource
      v-else
      :mode="mode"
      :validation-passed="true"
      :selected-subtype="value._type"
      :resource="value"
      :errors="errors"
      @finish="saveSecret"
      @error="e=>errors = e"
    >
      <NameNsDescription
        v-model="value"
        :mode="mode"
        :namespaced="!isCloud"
      />

      <div class="spacer" />
      <component
        :is="cloudComponent"
        v-if="isCloud"
        ref="cloudComponent"
        :driver-name="driverName"
        :value="value"
        :mode="mode"
        :hide-sensitive-data="hideSensitiveData"
      />
      <Tabbed
        v-else
        :side-tabs="true"
        default-tab="data"
      >
        <Tab
          name="data"
          :label="dataLabel"
          :weight="99"
        >
          <component
            :is="dataComponent"
            :value="value"
            :mode="mode"
            :hide-sensitive-data="hideSensitiveData"
          />
        </Tab>
        <Tab
          name="labels"
          label-key="generic.labelsAndAnnotations"
          :weight="-1"
        >
          <Labels
            v-model="value"
            :mode="mode"
          />
        </Tab>
      </Tabbed>
    </CruResource>
  </form>
</template>
