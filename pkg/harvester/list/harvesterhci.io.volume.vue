<script>
import Loading from '@shell/components/Loading';
import ResourceTable from '@shell/components/ResourceTable';
import HarvesterVolumeState from '../formatters/HarvesterVolumeState';

import { allSettled } from '../utils/promise';
import {
  PV, PVC, SCHEMA, LONGHORN, STORAGE_CLASS
} from '@shell/config/types';
import { HCI, VOLUME_SNAPSHOT } from '../types';
import { STATE, AGE, NAME, NAMESPACE } from '@shell/config/table-headers';

const schema = {
  id:         HCI.VOLUME,
  type:       SCHEMA,
  attributes: {
    kind:       HCI.VOLUME,
    namespaced: true
  },
  metadata: { name: HCI.VOLUME },
};

export default {
  name:       'HarvesterListVolume',
  components: {
    Loading, ResourceTable, HarvesterVolumeState
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;
    const _hash = {
      pvcs: this.$store.dispatch(`${ inStore }/findAll`, { type: PVC }),
      pvs:  this.$store.dispatch(`${ inStore }/findAll`, { type: PV }),
      vms:  this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.VM }),
      scs:  this.$store.dispatch(`${ inStore }/findAll`, { type: STORAGE_CLASS }),
    };

    const volumeSnapshotSchema = this.$store.getters[`${ inStore }/schemaFor`](VOLUME_SNAPSHOT);

    if (volumeSnapshotSchema) {
      _hash.snapshots = this.$store.dispatch(`${ inStore }/findAll`, { type: VOLUME_SNAPSHOT });
    }

    if (this.$store.getters[`${ inStore }/schemaFor`](LONGHORN.VOLUMES)) {
      _hash.longhornVolumes = this.$store.dispatch(`${ inStore }/findAll`, { type: LONGHORN.VOLUMES });
    }

    if (this.$store.getters[`${ inStore }/schemaFor`](LONGHORN.ENGINES)) {
      _hash.longhornEngines = this.$store.dispatch(`${ inStore }/findAll`, { type: LONGHORN.ENGINES });
    }

    const hash = await allSettled(_hash);

    const pvcSchema = this.$store.getters[`${ inStore }/schemaFor`](PVC);

    if (!pvcSchema?.collectionMethods.find(x => x.toLowerCase() === 'post')) {
      this.$store.dispatch('type-map/configureType', { match: HCI.VOLUME, isCreatable: false });
    }

    this.rows = hash.pvcs;
  },

  data() {
    return { rows: [] };
  },

  computed: {
    schema() {
      return schema;
    },

    headers() {
      return [
        STATE,
        NAME,
        NAMESPACE,
        {
          name:          'size',
          labelKey:      'tableHeaders.size',
          value:         'spec.resources.requests.storage',
          sort:          'volumeSort',
          formatter:     'Si',
          formatterOpts: {
            opts: {
              increment: 1024, addSuffix: true, maxExponent: 3, minExponent: 3, suffix: 'i',
            },
            needParseSi: true
          },
        },
        {
          name:     'storageClass',
          labelKey: 'tableHeaders.storageClass',
          value:    'spec.storageClassName'
        },
        {
          name:     'AttachedVM',
          labelKey: 'tableHeaders.attachedVM',
          type:     'attached',
          value:    'spec.claimRef',
          sort:     'name',
        },
        {
          name:      'VolumeSnapshotCounts',
          labelKey:  'harvester.tableHeaders.volumeSnapshotCounts',
          value:     'relatedVolumeSnapshotCounts',
          formatter: 'RelatedVolumeSnapshotCounts',
          sort:      'name',
          align:     'center',
        },
        {
          ...STATE,
          name:          'phase',
          labelKey:      'tableHeaders.phase',
          formatterOpts: { arbitrary: true },
          value:         'phaseState',
        },
        AGE,
      ];
    },
  },

  methods: {
    goTo(row) {
      return row?.attachVM?.detailLocation;
    },

    getVMName(row) {
      return row.attachVM?.metadata?.name || '';
    }
  },

  typeDisplay() {
    return this.$store.getters['type-map/labelFor'](schema, 99);
  },
};
</script>

<template>
  <Loading v-if="$fetchState.pending" />
  <ResourceTable
    v-else
    v-bind="$attrs"
    :headers="headers"
    :groupable="true"
    default-sort-by="age"
    :namespaced="true"
    :rows="rows"
    :schema="schema"
    key-field="_key"
    v-on="$listeners"
  >
    <template slot="cell:state" slot-scope="scope">
      <div class="state">
        <HarvesterVolumeState class="vmstate" :row="scope.row" />
      </div>
    </template>
    <template slot="cell:AttachedVM" slot-scope="scope">
      <div>
        <n-link v-if="getVMName(scope.row)" :to="goTo(scope.row)">
          {{ getVMName(scope.row) }}
        </n-link>
      </div>
    </template>
    <template #col:name="{row}">
      <td>
        <span>
          <n-link
            v-if="row?.detailLocation"
            :to="row.detailLocation"
          >
            {{ row.nameDisplay }}
            <i v-if="row.isEncrypted" class="icon icon-lock" />
          </n-link>
          <span v-else>
            {{ row.nameDisplay }}
          </span>
        </span>
      </td>
    </template>
  </ResourceTable>
</template>

<style lang="scss" scoped>
.state {
  display: flex;

  .vmstate {
    margin-right: 6px;
  }
}
</style>
