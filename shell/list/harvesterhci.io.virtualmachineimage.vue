<script>
import ResourceTable from '@shell/components/ResourceTable';
import { Banner } from '@components/Banner';
import ArrayList from '@shell/components/form/ArrayList';
import Select from '@shell/components/form/Select';
import { defaultTableSortGenerationFn } from '@shell/components/ResourceTable.vue';

export default {
  name: 'ListHarvesterImage',

  components: {
    ResourceTable,
    Banner,
    Select,
    ArrayList
  },

  props:      {
    schema: {
      type:     Object,
      required: true,
    },
    rows: {
      type:     Array,
      required: true,
    },
  },

  data() {
    return {
      searchLabels:    [],
      defaultAddValue: {
        key:   '',
        value: '',
      }
    };
  },

  computed: {
    uploadingImages() {
      return this.$store.getters['harvester-common/uploadingImages'] || [];
    },

    optionLabels() {
      const labels = this.rows.map((row) => {
        return Object.keys(row.labels);
      });

      return Array.from(new Set(labels.flat()));
    },

    filterRows() {
      const rows = this.rows.filter((row) => {
        const hasSearch = this.searchLabels.find(search => search.key);

        if (!hasSearch) {
          return this.rows;
        }

        const labels = row.labels;
        const keys = Object.keys(labels);

        return this.searchLabels.find((search) => {
          if (search.key && keys.includes(search.key)) {
            if (!search.value) { // If value is empty, all data containing the key is retained
              return true;
            } else if (search.value === labels[search.key]) {
              return true;
            } else if (search.value !== labels[search.key]) {
              return false;
            }
          } else {
            return false;
          }
        });
      });

      return rows;
    }
  },

  methods: {
    update() {
      const map = {};

      this.searchLabels.map((v) => {
        map[`${ v.key }`] = v.value;
      });
    },

    calcValueOptions(key) {
      const valueOptions = [];

      this.rows.map((row) => {
        const isExistValue = valueOptions.find(value => value.label === row.labels[key]);

        if (Object.keys(row.labels).includes(key) && key && row.labels[key] && !isExistValue) {
          valueOptions.push({
            value: row.labels[key],
            label: row.labels[key]
          });
        }
      });

      return valueOptions;
    },

    removeAll() {
      this.$set(this, 'searchLabels', []);
    },

    sortGenerationFn() {
      let base = defaultTableSortGenerationFn(this.schema, this.$store);

      this.searchLabels.map((label) => {
        base += label.key;
        base += label.value;
      });

      return base;
    },
  }
};
</script>

<template>
  <div>
    <Banner
      v-if="uploadingImages.length > 0"
      color="warning"
      :label="t('harvester.image.warning.uploading', {count: uploadingImages.length} )"
    />
    <ResourceTable
      v-bind="$attrs"
      :rows="filterRows"
      :schema="schema"
      :sort-generation-fn="sortGenerationFn"
      key-field="_key"
      v-on="$listeners"
    >
      <template #header-right>
        <v-popover
          trigger="click"
          placement="bottom-end"
        >
          <button ref="actionDropDown" class="btn bg-primary mr-10">
            <i class="icon icon-search" />
          </button>

          <template slot="popover">
            <div class="filter-popup">
              <div>
                <ArrayList
                  v-model="searchLabels"
                  :show-header="true"
                  :default-add-value="defaultAddValue"
                  @input="update"
                >
                  <template v-slot:column-headers>
                    <div class="box">
                      <div class="key">
                        Key
                        <span class="required">*</span>
                      </div>
                      <div class="value">
                        value
                      </div>
                      <div />
                    </div>
                  </template>
                  <template v-slot:columns="scope">
                    <div class="key">
                      <Select
                        ref="select"
                        key="label"
                        v-model="scope.row.value.key"
                        :append-to-body="false"
                        :searchable="true"
                        :options="optionLabels"
                        @input="update"
                      />
                    </div>
                    <div class="value">
                      <Select
                        v-if="calcValueOptions(scope.row.value.key).length > 0"
                        ref="select"
                        key="value"
                        v-model="scope.row.value.value"
                        :append-to-body="false"
                        :searchable="true"
                        :options="calcValueOptions(scope.row.value.key)"
                        @input="update"
                      />
                      <input v-else v-model="scope.row.value.value" class="input-sm" type="search" @input="update" />
                    </div>
                  </template>

                  <template #add="{add}">
                    <div>
                      <button
                        type="button"
                        class="btn role-tertiary add"
                        data-testid="add-item"
                        @click="add()"
                      >
                        Add
                      </button>

                      <button
                        type="button"
                        class="btn role-tertiary add"
                        data-testid="add-item"
                        @click="removeAll()"
                      >
                        ClearAll
                      </button>
                    </div>
                  </template>
                </ArrayList>
              </div>
            </div>
          </template>
        </v-popover>
      </template>
    </ResourceTable>
  </div>
</template>

<style lang="scss" scoped>
::v-deep .fixed-header-actions{
  grid-template-columns: [bulk] auto [middle] min-content [search] minmax(min-content, 264px);
}

.filter-popup {
  width: 600px;
}

::v-deep .box {
  display: grid;
  grid-template-columns: 40% 40% 10%;
  column-gap: 1.75%;
  align-items: center;
  margin-bottom: 10px;

  .key,
  .value {
    height: 100%;

    INPUT {
      height: $unlabeled-input-height;
    }
  }
}

.required {
  color: var(--error);
}
</style>
