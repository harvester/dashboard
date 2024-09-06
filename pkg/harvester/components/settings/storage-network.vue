<script>
import { LabeledInput } from '@components/Form/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import { RadioGroup } from '@components/Form/Radio';
import ArrayList from '@shell/components/form/ArrayList';
import { isValidCIDR } from '@shell/utils/validators/cidr';
import { _EDIT } from '@shell/config/query-params';
import { Banner } from '@components/Banner';
import Tip from '@shell/components/Tip';
import { HCI } from '../../types';
import { allHash } from '@shell/utils/promise';
import { NODE } from '@shell/config/types';
import { DOC_LINKS } from '../../config/doc-links';

export default {
  name: 'HarvesterEditStorageNetwork',

  components: {
    ArrayList,
    Tip,
    Banner,
    LabeledInput,
    LabeledSelect,
    RadioGroup
  },

  props: {
    registerBeforeHook: {
      type:     Function,
      required: true,
    },

    mode: {
      type:    String,
      default: _EDIT,
    },

    value: {
      type:    Object,
      default: () => {
        return {};
      },
    },
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;

    await allHash({
      clusterNetworks: this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.CLUSTER_NETWORK }),
      vlanStatus:      this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.VLAN_STATUS }),
      nodes:           this.$store.dispatch(`${ inStore }/findAll`, { type: NODE }),
    });
  },

  data() {
    let parsedDefaultValue = {};
    let openVlan = false;

    try {
      parsedDefaultValue = JSON.parse(this.value.value);
      openVlan = true;
    } catch (error) {
      parsedDefaultValue = {
        vlan:           '',
        clusterNetwork: '',
        range:          '',
        exclude:        []
      };
    }
    const exclude = parsedDefaultValue?.exclude?.toString().split(',') || [];

    return {
      openVlan,
      errors:          [],
      exclude,
      parsedDefaultValue,
      defaultAddValue: ''
    };
  },

  created() {
    if (this.registerBeforeHook) {
      this.registerBeforeHook(this.willSave, 'willSave');
    }
  },

  computed: {
    storageNetworkExampleLink() {
      return DOC_LINKS.STORAGE_NETWORK_EXAMPLE;
    },
    clusterNetworkOptions() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const clusterNetworks = this.$store.getters[`${ inStore }/all`](HCI.CLUSTER_NETWORK) || [];

      return clusterNetworks.map((n) => {
        const disabled = !n.isReadyForStorageNetwork;

        return {
          label: disabled ? `${ n.id } (${ this.t('generic.notReady') })` : n.id,
          value: n.id,
          disabled,
        };
      });
    },
  },

  methods: {
    update() {
      const exclude = this.exclude.filter(ip => ip);

      if (Array.isArray(exclude) && exclude.length > 0) {
        this.parsedDefaultValue.exclude = exclude;
      } else {
        delete this.parsedDefaultValue.exclude;
      }

      const valueString = JSON.stringify(this.parsedDefaultValue);

      if (this.openVlan) {
        this.$set(this.value, 'value', valueString);
      } else {
        this.$set(this.value, 'value', '');
      }
    },

    willSave() {
      this.update();
      const errors = [];

      if (this.openVlan) {
        const valid = !!/^(?:(?:[0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}(?:[0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\/([1-9]|[1-2]\d|3[0-2])$/.test(this.parsedDefaultValue.range);

        if (!valid) {
          errors.push(this.t('harvester.setting.storageNetwork.range.invalid', null, true));
        }

        if (!this.parsedDefaultValue.vlan) {
          errors.push(this.t('validation.required', { key: this.t('harvester.setting.storageNetwork.vlan') }, true));
        }

        if (!this.parsedDefaultValue.clusterNetwork) {
          errors.push(this.t('validation.required', { key: this.t('harvester.setting.storageNetwork.clusterNetwork') }, true));
        }

        if (this.exclude) {
          const hasInvalidCIDR = this.exclude.find((cidr) => {
            return !isValidCIDR(cidr);
          });

          if (hasInvalidCIDR) {
            errors.push(this.t('harvester.setting.storageNetwork.exclude.invalid', null, true));
          }
        }
      } else {
        return Promise.resolve();
      }

      if (errors.length > 0) {
        return Promise.reject(errors);
      } else {
        return Promise.resolve();
      }
    },
  },
};
</script>

<template>
  <div
    :class="mode"
    @input="update"
  >
    <Banner color="warning">
      <t k="harvester.setting.storageNetwork.warning" :raw="true" />
    </Banner>

    <RadioGroup
      v-model="openVlan"
      class="mb-20"
      name="model"
      :options="[true,false]"
      :labels="[t('generic.enabled'), t('generic.disabled')]"
      @input="update"
    />

    <div v-if="openVlan">
      <LabeledInput
        v-model.number="parsedDefaultValue.vlan"
        class="mb-20"
        :mode="mode"
        required
        label-key="harvester.setting.storageNetwork.vlan"
      />

      <LabeledSelect
        v-model="parsedDefaultValue.clusterNetwork"
        label-key="harvester.setting.storageNetwork.clusterNetwork"
        class="mb-20"
        required
        :options="clusterNetworkOptions"
        @input="update"
      />

      <LabeledInput
        v-model="parsedDefaultValue.range"
        class="mb-5"
        :mode="mode"
        required
        :placeholder="t('harvester.setting.storageNetwork.range.placeholder')"
        label-key="harvester.setting.storageNetwork.range.label"
      />
      <Tip class="mb-20" icon="icon icon-info">
        <t k="harvester.setting.storageNetwork.tip" :raw="true" :url="storageNetworkExampleLink" />
      </Tip>

      <ArrayList
        v-model="exclude"
        :show-header="true"
        :default-add-value="defaultAddValue"
        :mode="mode"
        :add-label="t('harvester.setting.storageNetwork.exclude.addIp')"
        @input="update"
      >
        <template v-slot:column-headers>
          <div class="box">
            <div class="key">
              {{ t('harvester.setting.storageNetwork.exclude.label') }}
            </div>
          </div>
        </template>
        <template v-slot:columns="scope">
          <div class="key">
            <input
              v-model="scope.row.value"
              :placeholder="t('harvester.setting.storageNetwork.exclude.placeholder')"
              @input="update"
            />
          </div>
        </template>
      </ArrayList>
    </div>
  </div>
</template>
