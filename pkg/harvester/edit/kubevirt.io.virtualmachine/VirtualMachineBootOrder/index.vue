<script>
import Vue from 'vue';
import draggable from 'vuedraggable';
import BootOrderCard from '../../../components/BootOrderCard';

import { _VIEW } from '@shell/config/query-params';
import { clone } from '@shell/utils/object';
import { BOOT_ORDER_TYPE } from '../../../mixins/harvester-vm';

function getId(elem) {
  return `${ elem.type }_${ elem.index }_${ elem.id }`;
}

export default {
  components: {
    draggable,
    BootOrderCard
  },

  props: {
    value: {
      type:    Array,
      default: () => {
        return [];
      }
    },

    mode: {
      type:     String,
      required: true
    },
  },

  data() {
    return {
      ordered:     [],
      unordered:   [],
      bootOrders:  [],
      hideLast:    false,
      showNext:    null,
      hideButtons: null,
    };
  },

  computed: {
    isView() {
      return this.mode === _VIEW;
    },
  },

  watch: {
    value: {
      handler(neu) {
        const value = clone(neu);

        const ordered = value.filter(f => f.bootOrder).sort((a, b) => a.bootOrder - b.bootOrder);

        const oldUnorderedIds = this.unordered.map(getId);
        const unordered = value.filter(f => !f.bootOrder).sort((a, b) => oldUnorderedIds.indexOf(getId(a)) - oldUnorderedIds.indexOf(getId(b)));

        const bootOrders = ordered.map(r => r.bootOrder);

        Vue.set(this, 'ordered', ordered);
        Vue.set(this, 'unordered', unordered);
        Vue.set(this, 'bootOrders', bootOrders);
      },
      immediate: true,
      deep:      true,
    },
  },

  methods: {
    findElem(elem) {
      return this.value.find(f => getId(f) === getId(elem));
    },

    getNextBootOrder() {
      let bootOrder = 1;

      while (this.bootOrders.includes(bootOrder)) {
        bootOrder++;
      }

      return bootOrder;
    },

    addBootOrder() {
      this.bootOrders = [
        ...this.bootOrders,
        this.getNextBootOrder()
      ].sort();
    },

    onMoveOrdered(v) {
      if (v.from.id === 'ordered' && v.to.id === 'unordered') {
        this.hideLast = true;
      } else {
        this.hideLast = false;
      }
    },

    onMoveUnordered(v) {
      if (v.from.id === 'unordered' && v.to.id === 'ordered') {
        if (!this.showNext) {
          this.showNext = [
            ...this.bootOrders,
            this.getNextBootOrder()
          ].sort();
        }
      } else {
        this.showNext = null;
      }
    },

    onMouseDownOrdered(index) {
      this.hideButtons = index;
    },

    onMouseUpOrdered() {
      this.hideButtons = null;
    },

    swapOrdered(index1, index2) {
      const ordered = clone(this.ordered);

      const temp = ordered[index1];

      ordered[index1] = ordered[index2];
      ordered[index2] = temp;

      this.ordered = ordered;

      this.update();
    },

    swapToOrdered() {
      this.addBootOrder();
      this.ordered.push(this.unordered[0]);
      this.unordered.splice(0, 1);

      this.update();
    },

    swapToOrderedAll() {
      this.unordered.forEach(this.addBootOrder);
      this.ordered.push(...this.unordered);
      this.unordered = [];

      this.update();
    },

    swapToUnordered() {
      this.bootOrders.pop();

      this.unordered.push(this.ordered[this.ordered.length - 1]);
      this.ordered.splice(this.ordered.length - 1, 1);

      this.update();
    },

    swapToUnorderedAll() {
      this.bootOrders = [];

      this.unordered.push(...this.ordered);
      this.ordered = [];

      this.update();
    },

    dragEndOrdered(v) {
      if (v.to.id === 'unordered') {
        this.bootOrders.pop();
      }

      this.hideLast = false;
      this.showNext = null;
      this.hideButtons = null;

      this.update();
    },

    dragEndUnordered(v) {
      if (v.to.id === 'ordered') {
        this.addBootOrder();
      }
      this.hideLast = false;
      this.showNext = null;

      this.update();
    },

    updateRows(bootOrderGetter) {
      return (r, index) => {
        const el = this.findElem(r);

        el.bootOrder = bootOrderGetter(index);

        return el;
      };
    },

    update() {
      const rows = [
        ...this.ordered.map(this.updateRows(i => this.bootOrders[i])),
        ...this.unordered.map(this.updateRows(() => undefined))
      ];

      const diskRows = rows.filter(f => f.type === BOOT_ORDER_TYPE.DISK);
      const networkRows = rows.filter(f => f.type === BOOT_ORDER_TYPE.INTERFACE);

      this.$emit('input', {
        diskRows,
        networkRows
      });
    },
  }
};
</script>

<template>
  <div v-if="value.length === 0">
    <span>No devices</span>
  </div>
  <div v-else class="base-container">
    <div class="boot-order">
      <div v-if="showNext">
        <div
          v-for="(pos, index) in showNext"
          :key="index"
          class="position-container"
        >
          <h4>{{ pos }}</h4>
        </div>
      </div>
      <div v-else>
        <div
          v-for="(pos, index) in bootOrders"
          :key="index"
          class="position-container"
        >
          <h4 v-if="!(hideLast && index === bootOrders.length - 1)">
            {{ pos }}
          </h4>
        </div>
      </div>
    </div>
    <div class="container" :class="{ 'is-view': isView }">
      <div class="devices">
        <draggable
          :id="'ordered'"
          v-model="ordered"
          :disabled="isView"
          group="rows"
          class="list-group ordered"
          :move="onMoveOrdered"
          @end="dragEndOrdered"
        >
          <div v-for="(row, index) in ordered" :key="index">
            <BootOrderCard
              class="card"
              :value="row"
              :show-buttons="hideButtons !== index"
              :index="index"
              :count="ordered.length"
              :mode="mode"
              @input="swapOrdered(index, index + $event)"
              @mousedown="onMouseDownOrdered(index)"
              @mouseup="onMouseUpOrdered"
            />
          </div>
        </draggable>
      </div>

      <div v-if="!isView" class="swap-buttons actions ml-15">
        <div class="buttons-container">
          <button :disabled="unordered.length === 0" class="btn btn-sm role-primary ml-5" @click.prevent="swapToOrderedAll">
            <i class="icon icon-lg icon-chevron-beginning"></i>
          </button>

          <button :disabled="unordered.length === 0" class="btn btn-sm role-primary mt-5 ml-5" @click.prevent="swapToOrdered">
            <i class="icon icon-lg icon-chevron-up"></i>
          </button>

          <button :disabled="ordered.length === 0" class="btn btn-sm role-primary mt-20 ml-5" @click.prevent="swapToUnordered">
            <i class="icon icon-lg icon-chevron-down"></i>
          </button>

          <button :disabled="ordered.length === 0" class="btn btn-sm role-primary mt-5 ml-5" @click.prevent="swapToUnorderedAll">
            <i class="icon icon-lg icon-chevron-end"></i>
          </button>
        </div>
      </div>

      <div class="devices">
        <draggable
          :id="'unordered'"
          v-model="unordered"
          :disabled="isView"
          group="rows"
          class="list-group unordered"
          :move="onMoveUnordered"
          @end="dragEndUnordered"
        >
          <div v-for="(row, index) in unordered" :key="index">
            <BootOrderCard
              class="card"
              :value="row"
              :showButtons="false"
              :mode="mode"
              :disabled="isView"
            />
          </div>
        </draggable>
      </div>
    </div>
  </div>
</template>

<style lang='scss' scoped>

  .base-container {
    display: flex;
    flex-direction: row;
  }

  .boot-order {
    width: 30px;
    .position-container {
      min-height: 65px;
      width: 30px;
      margin-bottom: 5px;
      display: flex;
      align-items: center;

      h4 {
        margin: 0;
      }
    }
  }

  .container {
    display: flex;
    flex-direction: row;
    padding-left: 0;

    &.is-view {
      flex-direction: column;
      gap: 20px;
    }

    .devices {
      width: inherit;
      min-width: 200px;
      max-width: 500px;

      .card {
        margin-bottom: 5px;
      }

      .card-title-slot {
        display: flex;
        flex-direction: row;
        width: 100%;

        .actions {
          margin-left: auto;
        }
      }
    }
  }

.icon-chevron-up, .icon-chevron-down {
  transform: rotate(-90deg);
}

.swap-buttons {
  display: flex;
  flex-direction: column;

  margin: 20px 20px 0 15px;

  .buttons-container {
    display: flex;
    flex-direction: column;
    vertical-align: middle;
    min-height: 150px;
  }
}

.actions {
  min-height: 65px;
  margin-bottom: 5px;
  padding-top: 0;
}

.buttons-container {
  height: 30px;
  display: flex;
}

.card-container {
  min-height: 130px;
}

.list-group:empty,
.list-group > div:empty {
  margin-top: 20px;
  padding:1rem;
  text-align:center;
}

.list-group:empty:before,
.list-group > div:empty:before {
  content: 'Drop devices here';
}
</style>
