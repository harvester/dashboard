<script>
import { _EDIT } from '@shell/config/query-params';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import InfoBox from '@shell/components/InfoBox';
import { CSI_DRIVER, VOLUME_SNAPSHOT_CLASS } from '../../types';
import { allHash } from '@shell/utils/promise';
import { LONGHORN_DRIVER } from '@shell/models/persistentvolume';

export default {
  name: 'HarvesterCsiDriver',

  components: {
    InfoBox,
    LabeledSelect,
  },

  props: {
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

    registerBeforeHook: {
      type:     Function,
      required: true,
    },
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;

    const hash = {
      csiDrivers:          this.$store.dispatch(`${ inStore }/findAll`, { type: CSI_DRIVER }),
      volumeSnapshotClass: this.$store.dispatch(`${ inStore }/findAll`, { type: VOLUME_SNAPSHOT_CLASS })
    };

    await allHash(hash);
  },

  data() {
    const initValue = this.value.value || this.value.default;
    const configArr = this.parseValue(initValue);

    return { configArr };
  },

  created() {
    if (this.registerBeforeHook) {
      this.registerBeforeHook(this.willSave, 'willSave');
    }
  },

  computed: {
    provisioners() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const csiDrivers = this.$store.getters[`${ inStore }/all`](CSI_DRIVER) || [];

      return csiDrivers.filter((provisioner) => {
        return !this.configArr.map(config => config.key).includes(provisioner.name);
      }).map((provisioner) => {
        return provisioner.name;
      });
    },

    disableAdd() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const csiDrivers = this.$store.getters[`${ inStore }/all`](CSI_DRIVER) || [];

      return this.configArr.length >= csiDrivers.length;
    }
  },

  methods: {
    getVolumeSnapshotOptions(provisioner) {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const volumeSnapshotClass = this.$store.getters[`${ inStore }/all`](VOLUME_SNAPSHOT_CLASS) || [];

      return volumeSnapshotClass.filter((snapshot) => {
        return snapshot.driver === provisioner;
      }).map((snapshot) => {
        return {
          label: snapshot.name,
          value: snapshot.name
        };
      });
    },

    parseValue(value) {
      const out = [];
      let csiConfigJson = {};

      try {
        csiConfigJson = JSON.parse(value);
      } catch (e) {
        new Error('json error');
      }

      for (const [key, value] of Object.entries(csiConfigJson)) {
        out.push({
          key,
          value,
        });
      }

      return out;
    },

    update() {
      const out = {};

      this.configArr.map((config) => {
        out[config.key] = config.value;
      });

      const value = this.configArr.length ? JSON.stringify(out) : '';

      this.$set(this.value, 'value', value);
    },

    willSave() {
      this.update();
      const errors = [];

      try {
        this.configArr.forEach((config) => {
          if (!config.key) {
            errors.push(this.t('validation.required', { key: this.t('harvester.setting.csiDriverConfig.provisioner') }, true));
          }

          if (!config.value.volumeSnapshotClassName) {
            errors.push(this.t('validation.required', { key: this.t('harvester.setting.csiDriverConfig.volumeSnapshotClassName') }, true));
          }

          if (!config.value.backupVolumeSnapshotClassName) {
            errors.push(this.t('validation.required', { key: this.t('harvester.setting.csiDriverConfig.backupVolumeSnapshotClassName') }, true));
          }
        });
      } catch (e) {

      }

      if (errors.length > 0) {
        return Promise.reject(errors);
      } else {
        return Promise.resolve();
      }
    },

    remove(idx) {
      this.configArr.splice(idx, 1);
    },

    disableEdit(driver) {
      return driver === LONGHORN_DRIVER;
    },

    add() {
      this.configArr.push({
        key:   '',
        value: { volumeSnapshotClassName: '', backupVolumeSnapshotClassName: '' }
      });
    },

    useDefault() {
      const configArr = this.parseValue(this.value.default);

      this.$set(this, 'configArr', configArr);
      this.update();
    }
  }
};
</script>

<template>
  <div>
    <InfoBox v-for="(driver, idx) in configArr" :key="driver.key" class="box">
      <button :disabled="disableEdit(driver.key)" type="button" class="role-link btn btn-sm remove" @click="remove(idx)">
        <i class="icon icon-x" />
      </button>

      <div class="row">
        <div class="col span-4">
          <LabeledSelect
            v-model="driver.key"
            :mode="mode"
            required
            :disabled="disableEdit(driver.key)"
            label-key="harvester.setting.csiDriverConfig.provisioner"
            :searchable="true"
            :options="provisioners"
            @keydown.native.enter.prevent="()=>{}"
            @input="update"
          />
        </div>

        <div class="col span-4">
          <LabeledSelect
            v-model="driver.value.volumeSnapshotClassName"
            :mode="mode"
            required
            :disabled="disableEdit(driver.key)"
            :options="getVolumeSnapshotOptions(driver.key)"
            :label="t('harvester.setting.csiDriverConfig.volumeSnapshotClassName')"
            @keydown.native.enter.prevent="()=>{}"
            @input="update"
          />
        </div>

        <div class="col span-4">
          <LabeledSelect
            v-model="driver.value.backupVolumeSnapshotClassName"
            :mode="mode"
            required
            :disabled="disableEdit(driver.key)"
            :options="getVolumeSnapshotOptions(driver.key)"
            :label="t('harvester.setting.csiDriverConfig.backupVolumeSnapshotClassName')"
            @keydown.native.enter.prevent="()=>{}"
            @input="update"
          />
        </div>
      </div>
    </infobox>

    <button class="btn btn-sm role-primary" :disabled="disableAdd" @click.self="add">
      {{ t('generic.add') }}
    </button>
  </div>
</template>

<style lang="scss" scoped>
.box {
  position: relative;
  padding-top: 40px;
}
.remove {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 0px;
}
</style>
