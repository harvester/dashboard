<script>
import InfoBox from '@shell/components/InfoBox';
import Base from './base';

import { NETWORK_ATTACHMENT } from '@shell/config/types';
import { HCI as HCI_ANNOTATIONS } from '../../../config/labels-annotations';
import { sortBy } from '@shell/utils/sort';
import { clone } from '@shell/utils/object';
import { randomStr } from '@shell/utils/string';
import { removeObject } from '@shell/utils/array';
import { _VIEW } from '@shell/config/query-params';

export default {
  components: { InfoBox, Base },

  props: {
    mode: {
      type:    String,
      default: 'create'
    },

    value: {
      type:    Array,
      default: () => {
        return [];
      }
    },

    isSingle: {
      type:    Boolean,
      default: true
    }
  },

  data() {
    return {
      rows:    this.addKeyId(clone(this.value)),
      nameIdx: 1
    };
  },

  computed: {
    isView() {
      return this.mode === _VIEW;
    },

    networkOption() {
      const choices = this.$store.getters['harvester/all'](NETWORK_ATTACHMENT).filter((row) => {
        return !row.metadata?.annotations?.[HCI_ANNOTATIONS.STORAGE_NETWORK];
      });

      const out = sortBy(
        choices.map((N) => {
          const label = N.isNotReady ? `${ N.id } (${ this.t('generic.notReady') })` : N.id;

          return {
            label,
            value:    N.id,
            disabled: N.isNotReady,
          };
        }),
        'label'
      );

      return out;
    },
  },

  watch: {
    value(neu) {
      this.rows = neu;
    },
  },

  methods: {
    add(type) {
      const name = this.generateName();

      const neu = {
        name,
        networkName: '',
        model:       'virtio',
        type:        'bridge',
        newCreateId: randomStr(10),
        rowKeyId:    randomStr(10)
      };

      this.rows.push(neu);
      this.update();
    },

    remove(vol) {
      removeObject(this.rows, vol);
      this.update();
    },

    addKeyId(row) {
      return row.map((R) => {
        return {
          ...R,
          rowKeyId: randomStr(10)
        };
      });
    },

    generateName() {
      let name = '';
      let hasUsed = true;

      while (hasUsed) {
        name = `nic-${ this.nameIdx }`;
        hasUsed = this.rows.find( O => O.name === name);
        this.nameIdx++;
      }

      return name;
    },

    update() {
      this.$emit('input', this.rows);
    }
  }
};
</script>

<template>
  <div>
    <InfoBox v-for="(row, i) in rows" :key="i" class="infoBox">
      <button v-if="!isView" type="button" class="role-link remove-vol" @click="remove(row)">
        <i class="icon icon-x" />
      </button>

      <h3> {{ t('harvester.virtualMachine.network.title') }} </h3>

      <Base
        :key="rows[i].rowKeyId"
        v-model="rows[i]"
        :rows="rows"
        :mode="mode"
        :is-single="isSingle"
        :network-option="networkOption"
        @update="update"
      />
    </InfoBox>

    <button v-if="!isView" type="button" class="btn btn-sm bg-primary" @click="add">
      {{ t('harvester.virtualMachine.network.addNetwork') }}
    </button>
  </div>
</template>

<style lang='scss' scoped>
.infoBox{
  position: relative;
}

.remove-vol {
  position: absolute;
  top: 10px;
  right: 16px;
  padding:0px;
  max-height: 28px;
  min-height: 28px;
}
</style>
