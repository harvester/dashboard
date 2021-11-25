<script>
import LabeledInput from '@/components/form/LabeledInput';
import LabeledSelect from '@/components/form/LabeledSelect';
import ArrayList from '@/components/form/ArrayList';
import { NAMESPACE } from '@/config/types';
import { _EDIT } from '@/config/query-params';
import { uniq } from '@/utils/array';

const OPTION_GLOBAL = 'global';
const POOL = 'pool';
const RANGE = 'range';

export default {
  name: 'HarvesterEditVip',

  components: {
    LabeledInput,
    LabeledSelect,
    ArrayList,
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

  data() {
    let parsedDefaultValue = {};

    try {
      parsedDefaultValue = JSON.parse(this.value.value);
    } catch (error) {
      parsedDefaultValue = JSON.parse(this.value.default || '{}');
    }

    const vips = Object.keys(parsedDefaultValue).map((key) => {
      return {
        key,
        value: parsedDefaultValue[key],
      };
    }) || [];

    return {
      errors:          [],
      vips,
      defaultAddValue: {
        key:     '',
        value:   '',
        type:    POOL,
        startIP: '',
        endIP:   '',
      },
    };
  },

  created() {
    if (this.registerBeforeHook) {
      this.registerBeforeHook(this.willSave, 'willSave');
    }
  },

  computed: {
    namespaces() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const namespaces = this.$store.getters[`${ inStore }/all`](NAMESPACE);

      const global = {
        label: OPTION_GLOBAL,
        value: OPTION_GLOBAL,
      };

      const out = namespaces.filter(o => !o.isSystem && !o.isFleetManaged).map((o) => {
        return {
          label: o.id,
          value: o.id,
        };
      });

      return [global, ...out];
    },

    selectedNamespaces() {
      return this.vips.map(v => v.key) || [];
    },

    filteredNamespaces() {
      return this.namespaces.filter(n => !this.selectedNamespaces.includes(n.value));
    },

    typeOptions() {
      return [{
        label: this.t('harvester.vip.type.pool'),
        value: POOL,
      }, {
        label: this.t('harvester.vip.type.range'),
        value: RANGE,
      }];
    },
  },

  methods: {
    update() {
      const map = {};

      this.vips.map((v) => {
        if (v.type === POOL) {
          map[`${ v.key }`] = v.value;
        } else {
          map[`${ v.key }`] = `${ v.startIP }-${ v.endIP }`;
        }
      });

      const value = JSON.stringify(map);

      this.$set(this.value, 'value', value);
    },

    willSave() {
      let errors = [];

      this.vips.map((v) => {
        if (!v.key) {
          errors.push(this.t('validation.required', { key: this.t('harvester.vip.namespace.label') }, true));
        }

        if (v.type === POOL) {
          if (!v.value) {
            errors.push(this.t('validation.required', { key: this.t('harvester.vip.cidr.label') }, true));
          }
        } else {
          if (!v.startIP) {
            errors.push(this.t('validation.required', { key: this.t('harvester.vip.startIP.label') }, true));
          }
          if (!v.endIP) {
            errors.push(this.t('validation.required', { key: this.t('harvester.vip.endIP.label') }, true));
          }
        }
      });

      errors = uniq(errors);

      if (errors.length > 0) {
        return Promise.reject(errors);
      } else {
        return Promise.resolve();
      }
    },
  },

  watch: {
    value: {
      handler(value) {
        let parsedDefaultValue = {};

        try {
          parsedDefaultValue = JSON.parse(value.value);
        } catch (error) {
          parsedDefaultValue = JSON.parse(this.value.default || '{}');
        }

        const vips = Object.keys(parsedDefaultValue).map((key) => {
          const value = parsedDefaultValue[key] || '';

          if (value.includes('-')) {
            const [startIP, endIP] = value.split('-');

            return {
              key,
              value: '',
              startIP,
              endIP,
              type:  RANGE,
            };
          } else {
            return {
              key,
              value,
              type:    POOL,
              startIP: '',
              endIP:   '',
            };
          }
        }) || [];

        this.$set(this, 'vips', vips);
        this.update();
      },
      deep: true,
    }
  },
};
</script>

<template>
  <div
    class="vip-selector"
    :class="{[mode]: true}"
    @input="update"
  >
    <ArrayList
      v-model="vips"
      :show-header="true"
      :default-add-value="defaultAddValue"
      :mode="mode"
      :add-label="t('harvester.vip.add.label')"
      @input="update"
    >
      <template v-slot:column-headers>
        <div class="box">
          <div class="key" />
          <div class="type" />
          <div class="value" />
          <div />
        </div>
      </template>
      <template v-slot:columns="scope">
        <div class="key">
          <LabeledSelect
            v-model="scope.row.value.key"
            :mode="mode"
            :options="filteredNamespaces"
            :label="t('harvester.vip.namespace.label')"
            required
            @input="update"
          />
        </div>
        <div class="type">
          <LabeledSelect
            v-model="scope.row.value.type"
            :mode="mode"
            :options="typeOptions"
            :label="t('harvester.vip.type.label')"
            @input="update"
          />
        </div>
        <div class="value">
          <div v-if="scope.row.value.type === 'pool'">
            <LabeledInput
              v-model="scope.row.value.value"
              :mode="mode"
              :placeholder="t('harvester.vip.cidr.placeholder')"
              :label="t('harvester.vip.cidr.label')"
              required
              @input="update"
            />
          </div>
          <div v-else class="row">
            <div class="span-6 col">
              <LabeledInput
                v-model="scope.row.value.startIP"
                :mode="mode"
                :placeholder="t('harvester.vip.startIP.placeholder')"
                :label="t('harvester.vip.startIP.label')"
                required
                @input="update"
              />
            </div>
            <div class="span-6 col">
              <LabeledInput
                v-model="scope.row.value.endIP"
                :mode="mode"
                :placeholder="t('harvester.vip.endIP.placeholder')"
                :label="t('harvester.vip.endIP.label')"
                required
                @input="update"
              />
            </div>
          </div>
        </div>
      </template>
    </ArrayList>
  </div>
</template>

<style lang="scss" scoped>
.vip-selector {
  &:not(.view) table {
    table-layout: initial;
  }

  ::v-deep .box {
    display: grid;
    grid-template-columns: 35% 10% 35% 8%;
    column-gap: 1.75%;
    align-items: center;
    margin-bottom: 10px;

    .key,
    .value,
    .type {
      height: 100%;
    }
  }

  .labeled-select {
    height: 100%;
  }

  .required {
    color: var(--error);
  }
}
</style>
