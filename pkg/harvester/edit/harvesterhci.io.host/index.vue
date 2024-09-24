<script>
import { mapGetters } from 'vuex';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import Footer from '@shell/components/form/Footer';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import { LabeledInput } from '@components/Form/LabeledInput';
import ArrayListGrouped from '@shell/components/form/ArrayListGrouped';
import ButtonDropdown from '@shell/components/ButtonDropdown';
import CreateEditView from '@shell/mixins/create-edit-view';
import { HCI as HCI_LABELS_ANNOTATIONS } from '@pkg/harvester/config/labels-annotations';
import { LONGHORN, SECRET } from '@shell/config/types';
import { HCI } from '../../types';
import { allHash } from '@shell/utils/promise';
import { formatSi } from '@shell/utils/units';
import { findBy } from '@shell/utils/array';
import { clone } from '@shell/utils/object';
import { exceptionToErrorsArray } from '@shell/utils/error';
import KeyValue from '@shell/components/form/KeyValue';
import Loading from '@shell/components/Loading.vue';
import MessageLink from '@shell/components/MessageLink';
import { ADD_ONS } from '@pkg/harvester/config/harvester-map';
import { PRODUCT_NAME as HARVESTER_PRODUCT } from '@pkg/harvester/config/harvester';

import { _EDIT } from '@shell/config/query-params';
import { sortBy } from '@shell/utils/sort';
import { Banner } from '@components/Banner';
import HarvesterDisk from './HarvesterDisk';
import HarvesterKsmtuned from './HarvesterKsmtuned';
import HarvesterSeeder from './HarvesterSeeder';
import Tags from '../../components/DiskTags';
import { LONGHORN_DRIVER, LONGHORN_VERSION_V1, LONGHORN_VERSION_V2 } from '@shell/models/persistentvolume';
import { LVM_DRIVER } from '../../models/harvester/storage.k8s.io.storageclass';
import isEqual from 'lodash/isEqual';

export const LONGHORN_SYSTEM = 'longhorn-system';

export const LONGHORN_V2_DATA_ENGINE = 'longhorn-system/v2-data-engine';

export default {
  name:       'HarvesterEditNode',
  components: {
    Footer,
    Tabbed,
    Tab,
    LabeledInput,
    NameNsDescription,
    ArrayListGrouped,
    HarvesterDisk,
    HarvesterKsmtuned,
    ButtonDropdown,
    KeyValue,
    Banner,
    Tags,
    Loading,
    HarvesterSeeder,
    MessageLink,
  },
  mixins: [CreateEditView],
  props:  {
    value: {
      type:     Object,
      required: true,
    }
  },
  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;

    const hash = {
      longhornNodes:        this.$store.dispatch(`${ inStore }/findAll`, { type: LONGHORN.NODES }),
      blockDevices:         this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.BLOCK_DEVICE }),
      addons:               this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.ADD_ONS }),
      secrets:              this.$store.dispatch(`${ inStore }/findAll`, { type: SECRET }),
      longhornV2DataEngine: this.$store.dispatch(`${ inStore }/find`, { type: LONGHORN.SETTINGS, id: LONGHORN_V2_DATA_ENGINE }),
    };

    if (this.$store.getters[`${ inStore }/schemaFor`](HCI.INVENTORY)) {
      hash.inventories = this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.INVENTORY });
    }

    await allHash(hash);

    const blockDevices = this.$store.getters[`${ inStore }/all`](HCI.BLOCK_DEVICE);
    const provisionedBlockDevices = blockDevices.filter((d) => {
      const isCurrentNode = d?.spec?.nodeName === this.value.id;
      const isLonghornMounted = findBy(this.longhornDisks, 'name', d.metadata.name);

      return d?.isProvisioned && isCurrentNode && !isLonghornMounted;
    })
      .map((d) => {
        const corrupted = d?.status?.deviceStatus?.fileSystem?.corrupted;

        return {
          isNew:              true,
          name:               d?.metadata?.name,
          originPath:         d?.spec?.fileSystem?.mountPoint,
          path:               d?.spec?.fileSystem?.mountPoint,
          blockDevice:        d,
          displayName:        d?.displayName,
          forceFormatted:     corrupted ? true : d?.spec?.fileSystem?.forceFormatted || false,
          provisioner:        d?.spec?.provisioner?.lvm ? LVM_DRIVER : LONGHORN_DRIVER,
          provisionerVersion: d?.spec?.provisioner?.longhorn?.engineVersion || LONGHORN_VERSION_V1,
          lvmVolumeGroup:     d?.spec?.provisioner?.lvm?.vgName,
        };
      });

    const disks = [...this.longhornDisks, ...provisionedBlockDevices];

    this.disks = disks;
    this.newDisks = clone(disks);
    this.blockDeviceOpts = this.getBlockDeviceOpts();

    const addons = this.$store.getters[`${ inStore }/all`](HCI.ADD_ONS);
    const seeder = addons.find(addon => addon.id === `harvester-system/${ ADD_ONS.HARVESTER_SEEDER }`);

    const seederEnabled = seeder ? seeder?.spec?.enabled : false;

    if (seederEnabled) {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const inventories = this.$store.getters[`${ inStore }/all`](HCI.INVENTORY) || [];

      const inventory = inventories.find(inv => inv.id === `harvester-system/${ this.value.id }`);

      if (inventory) {
        this.inventory = await this.$store.dispatch(`${ inStore }/clone`, { resource: inventory });
      } else {
        this.inventory = await this.$store.dispatch(`${ inStore }/create`, {
          type:     HCI.INVENTORY,
          metadata: {
            name:      this.value.id,
            namespace: 'harvester-system'
          },
        });

        this.inventory.applyDefaults();
      }
    }
  },

  data() {
    const customName = this.value.metadata?.annotations?.[HCI_LABELS_ANNOTATIONS.HOST_CUSTOM_NAME] || '';
    const consoleUrl = this.value.metadata?.annotations?.[HCI_LABELS_ANNOTATIONS.HOST_CONSOLE_URL] || '';

    return {
      customName,
      consoleUrl,
      disks:           [],
      newDisks:        [],
      blockDevice:     [],
      blockDeviceOpts: [],
      filteredLabels:  clone(this.value.filteredSystemLabels),
      inventory:       {},
      originValue:     clone(this.value),
    };
  },
  computed: {
    ...mapGetters({ t: 'i18n/t' }),

    removedDisks() {
      const out = this.disks.filter((d) => {
        return !findBy(this.newDisks, 'name', d.name);
      }) || [];

      return out;
    },

    longhornSystemVersion() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const v2DataEngine = this.$store.getters[`${ inStore }/byId`](LONGHORN.SETTINGS, LONGHORN_V2_DATA_ENGINE) || {};

      return v2DataEngine.value === 'true' ? LONGHORN_VERSION_V2 : LONGHORN_VERSION_V1;
    },

    longhornDisks() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const longhornNode = this.$store.getters[`${ inStore }/byId`](LONGHORN.NODES, `${ LONGHORN_SYSTEM }/${ this.value.id }`);
      const diskStatus = longhornNode?.status?.diskStatus || {};
      const diskSpec = longhornNode?.spec?.disks || {};

      const formatOptions = {
        increment:    1024,
        minExponent:  3,
        maxExponent:  3,
        maxPrecision: 2,
        suffix:       'iB',
      };

      const longhornDisks = Object.keys(diskStatus).map((key) => {
        const blockDevice = this.$store.getters[`${ inStore }/byId`](HCI.BLOCK_DEVICE, `${ LONGHORN_SYSTEM }/${ key }`);

        return {
          ...diskStatus[key],
          ...diskSpec?.[key],
          name:               key,
          isNew:              false,
          storageReserved:    formatSi(diskSpec[key]?.storageReserved, formatOptions),
          storageAvailable:   formatSi(diskStatus[key]?.storageAvailable, formatOptions),
          storageMaximum:     formatSi(diskStatus[key]?.storageMaximum, formatOptions),
          storageScheduled:   formatSi(diskStatus[key]?.storageScheduled, formatOptions),
          blockDevice,
          displayName:        blockDevice?.displayName || key,
          forceFormatted:     blockDevice?.spec?.fileSystem?.forceFormatted || false,
          tags:               diskSpec?.[key]?.tags || [],
          provisioner:        blockDevice?.spec?.provisioner?.lvm ? LVM_DRIVER : LONGHORN_DRIVER,
          provisionerVersion: blockDevice?.spec?.provisioner?.longhorn?.engineVersion || LONGHORN_VERSION_V1,
          lvmVolumeGroup:     blockDevice?.spec?.provisioner?.lvm?.vgName,
        };
      });

      return longhornDisks;
    },

    showFormattedWarning() {
      const out = this.newDisks.filter(d => d.forceFormatted && d.isNew && d.provisionerVersion === LONGHORN_VERSION_V1) || [];

      return out.length > 0;
    },

    hasKsmtunedSchema() {
      const inStore = this.$store.getters['currentProduct'].inStore;

      return !!this.$store.getters[`${ inStore }/schemaFor`](HCI.KSTUNED);
    },

    hasBlockDevicesSchema() {
      const inStore = this.$store.getters['currentProduct'].inStore;

      return !!this.$store.getters[`${ inStore }/schemaFor`](HCI.BLOCK_DEVICE);
    },

    longhornNode() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const longhornNodes = this.$store.getters[`${ inStore }/all`](LONGHORN.NODES);

      return longhornNodes.find(node => node.id === `${ LONGHORN_SYSTEM }/${ this.value.id }`);
    },

    seederEnabled() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const addons = this.$store.getters[`${ inStore }/all`](HCI.ADD_ONS);
      const seeder = addons.find(addon => addon.id === `harvester-system/${ ADD_ONS.HARVESTER_SEEDER }`);

      return seeder ? seeder?.spec?.enabled : false;
    },

    toEnableSeederAddon() {
      const { cluster } = this.$router?.currentRoute?.params || {};

      return {
        name:   `${ HARVESTER_PRODUCT }-c-cluster-resource-namespace-id`,
        params: {
          resource:  `${ HCI.ADD_ONS }`,
          namespace: 'harvester-system',
          cluster,
          id:        `${ ADD_ONS.HARVESTER_SEEDER }`
        },
        query: { mode: _EDIT }
      };
    },

    hasAddonSchema() {
      const inStore = this.$store.getters['currentProduct'].inStore;

      return this.$store.getters[`${ inStore }/schemaFor`](HCI.ADD_ONS);
    },

    hasSeederAddon() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const addons = this.$store.getters[`${ inStore }/all`](HCI.ADD_ONS);

      return addons.find(addon => addon.id === `harvester-system/${ ADD_ONS.HARVESTER_SEEDER }`);
    },

    hasInventorySchema() {
      const inStore = this.$store.getters['currentProduct'].inStore;

      return this.$store.getters[`${ inStore }/schemaFor`](HCI.INVENTORY);
    },
  },
  watch: {
    customName(neu) {
      this.value.setAnnotation(HCI_LABELS_ANNOTATIONS.HOST_CUSTOM_NAME, neu);
    },

    consoleUrl(neu) {
      this.value.setAnnotation(HCI_LABELS_ANNOTATIONS.HOST_CONSOLE_URL, neu);
    },

    newDisks() {
      this.blockDeviceOpts = this.getBlockDeviceOpts();
    },
  },

  created() {
    if (this.registerBeforeHook) {
      this.registerBeforeHook(this.willSave, 'willSave');
    }

    if (this.registerAfterHook) {
      this.registerAfterHook(this.saveDisk);
      this.registerAfterHook(this.saveLonghornNode);
    }
  },

  methods: {
    addDisk(id) {
      const removedDisk = findBy(this.removedDisks, 'blockDevice.id', id);

      if (removedDisk) {
        return this.newDisks.push(removedDisk);
      }

      const inStore = this.$store.getters['currentProduct'].inStore;
      const disk = this.$store.getters[`${ inStore }/byId`](HCI.BLOCK_DEVICE, id);
      const mountPoint = disk?.spec?.fileSystem?.mountPoint;
      const lastFormattedAt = disk?.status?.deviceStatus?.fileSystem?.LastFormattedAt;

      let forceFormatted = true;
      const systems = ['ext4', 'XFS'];

      if (disk.childParts?.length > 0) {
        forceFormatted = true;
      } else if (lastFormattedAt) {
        forceFormatted = false;
      } else if (systems.includes(disk?.status?.deviceStatus?.fileSystem?.type)) {
        forceFormatted = false;
      }

      const name = disk?.metadata?.name;

      this.newDisks.push({
        name,
        path:               mountPoint,
        allowScheduling:    false,
        evictionRequested:  false,
        storageReserved:    0,
        isNew:              true,
        originPath:         disk?.spec?.fileSystem?.mountPoint,
        blockDevice:        disk,
        displayName:        disk?.displayName,
        forceFormatted,
        provisioner:        LONGHORN_DRIVER,
        provisionerVersion: LONGHORN_VERSION_V1,
        lvmVolumeGroup:     null,
      });
    },

    async saveDisk() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const addDisks = this.newDisks.filter(d => d.isNew);
      const removeDisks = this.disks.filter(d => !findBy(this.newDisks, 'name', d.name) && d.blockDevice);

      if (addDisks.length === 0 && removeDisks.length === 0) {
        return Promise.resolve();
      } else if (addDisks.length !== 0 && removeDisks.length === 0) {
        const updatedDisks = addDisks.filter((d) => {
          const blockDevice = this.$store.getters[`${ inStore }/byId`](HCI.BLOCK_DEVICE, `${ LONGHORN_SYSTEM }/${ d.name }`);
          const { forceFormatted } = blockDevice.spec.fileSystem;
          const { provisioner } = blockDevice.spec;

          return !(blockDevice.isProvisioned && forceFormatted === d.forceFormatted && isEqual(provisioner, d.provisioner));
        });

        if (updatedDisks.length === 0) {
          return Promise.resolve();
        }
      }

      try {
        await Promise.all(addDisks.map((d) => {
          const blockDevice = this.$store.getters[`${ inStore }/byId`](HCI.BLOCK_DEVICE, `${ LONGHORN_SYSTEM }/${ d.name }`);

          blockDevice.spec.provision = true;
          blockDevice.spec.fileSystem.forceFormatted = d.forceFormatted;

          switch (d.provisioner) {
          case LONGHORN_DRIVER:
            blockDevice.spec.provisioner = { longhorn: { engineVersion: d.provisionerVersion } };
            break;
          case LVM_DRIVER:
            blockDevice.spec.provisioner = { lvm: { vgName: d.lvmVolumeGroup } };
            break;
          }

          return blockDevice.save();
        }));

        await Promise.all(removeDisks.map((d) => {
          const blockDevice = this.$store.getters[`${ inStore }/byId`](HCI.BLOCK_DEVICE, `${ LONGHORN_SYSTEM }/${ d.name }`);

          blockDevice.spec.provision = false;

          return blockDevice.save();
        }));

        this.$store.dispatch('growl/success', {
          title:   this.t('generic.notification.title.succeed'),
          message: this.t('harvester.host.disk.notification.success', { name: this.value.metadata?.name || '' }),
        }, { root: true });
      } catch (err) {
        return Promise.reject(exceptionToErrorsArray(err));
      }
    },

    canRemove(row) {
      return !!row?.value?.blockDevice;
    },

    onRemove(scope) {
      scope.remove();
    },

    updateHostLabels(labels) {
      this.filteredLabels = labels;
    },

    selectable(opt) {
      if ( opt.disabled) {
        return false;
      }

      return true;
    },

    getBlockDeviceOpts() {
      const inStore = this.$store.getters['currentProduct'].inStore;
      const blockDevices = this.$store.getters[`${ inStore }/all`](HCI.BLOCK_DEVICE);

      const out = blockDevices
        .filter((d) => {
          const addedToNodeCondition = findBy(d?.status?.conditions || [], 'type', 'AddedToNode');
          const isAdded = findBy(this.newDisks, 'name', d.metadata.name);
          const isRemoved = findBy(this.removedDisks, 'name', d.metadata.name);

          const deviceType = d.status?.deviceStatus?.details?.deviceType;

          if (deviceType !== 'disk' || d?.status?.state !== 'Active') {
            return false;
          }

          if ((!findBy(this.disks || [], 'name', d.metadata.name) &&
                d?.spec?.nodeName === this.value.id &&
                (!addedToNodeCondition || addedToNodeCondition?.status === 'False') &&
                !d?.isProvisioned &&
                !isAdded) ||
                isRemoved
          ) {
            return true;
          } else {
            return false;
          }
        })
        .map((d) => {
          const devPath = d.spec?.devPath;
          const deviceType = d.status?.deviceStatus?.details?.deviceType;
          const sizeBytes = d.status?.deviceStatus?.capacity?.sizeBytes;
          const size = formatSi(sizeBytes, { increment: 1024 });
          const parentDevice = d.status?.deviceStatus?.parentDevice;
          const isChildAdded = this.newDisks.find(newDisk => newDisk.blockDevice?.status?.deviceStatus?.parentDevice === devPath);
          const name = d.displayName;

          let label = `${ name } (Type: ${ deviceType }, Size: ${ size })`;

          if (parentDevice) {
            label = `- ${ label }`;
          }

          return {
            label,
            value:    d.id,
            action:   this.addDisk,
            kind:     !parentDevice ? 'group' : '',
            disabled: !!isChildAdded,
            group:    parentDevice || devPath,
            isParent: !!parentDevice,
          };
        });

      return sortBy(out, ['group', 'isParent', 'label']);
    },

    ddButtonAction() {
      this.blockDeviceOpts = this.getBlockDeviceOpts();
    },

    willSave() {
      const filteredLabels = this.filteredLabels || {};

      this.value.metadata.labels = {
        ...this.value.metadata.labels,
        ...filteredLabels,
      };

      const originLabels = this.value.filteredSystemLabels;

      Object.keys(originLabels).map((key) => {
        if (!filteredLabels[key]) {
          delete this.value.metadata.labels[key];
        }
      });
    },

    async saveLonghornNode() {
      const inStore = this.$store.getters['currentProduct'].inStore;

      const disks = this.longhornNode?.spec?.disks || {};

      // update each disk tags and scheduling
      this.newDisks.map((disk) => {
        (disks[disk.name] || {}).tags = disk.tags;
        (disks[disk.name] || {}).allowScheduling = disk.allowScheduling;
      });
      let count = 0;

      const retrySave = async() => {
        try {
          await this.longhornNode.save();
        } catch (err) {
          if ((err.status === 409 || err.status === 403) && count < 3) {
            count++;

            await this.$store.dispatch(`${ inStore }/find`, {
              type: LONGHORN.NODES,
              id:   this.longhornNode.id,
              opt:  { force: true },
            });

            await new Promise(resolve => setTimeout(resolve, '5000'));
            await retrySave();
          } else {
            return Promise.reject(exceptionToErrorsArray(err));
          }
        }
      };

      if (this.longhornNode) {
        await retrySave();
      }
    },
  },
};
</script>
<template>
  <Loading v-if="$fetchState.pending" />
  <div v-else id="node">
    <div class="content">
      <NameNsDescription
        :value="value"
        :namespaced="false"
        :mode="mode"
      />
      <Tabbed ref="tabbed" class="mt-15" :side-tabs="true">
        <Tab name="basics" :weight="100" :label="t('harvester.host.tabs.basics')">
          <LabeledInput
            v-model="customName"
            :label="t('harvester.host.detail.customName')"
            class="mb-20"
            :mode="mode"
          />

          <LabeledInput
            v-model="consoleUrl"
            :label="t('harvester.host.detail.consoleUrl')"
            class="mb-20"
            :mode="mode"
          />
        </Tab>
        <Tab
          v-if="hasBlockDevicesSchema"
          name="disk"
          :weight="80"
          :label="t('harvester.host.tabs.storage')"
        >
          <div
            v-if="longhornNode"
            class="row mb-20"
          >
            <div class="col span-12">
              <Tags
                v-model="longhornNode.spec.tags"
                :label="t('harvester.host.tags.label')"
                :add-label="t('harvester.host.tags.addLabel')"
                :mode="mode"
              />
            </div>
          </div>
          <ArrayListGrouped
            v-model="newDisks"
            :mode="mode"
            :initial-empty-row="false"
          >
            <template #default="props">
              <HarvesterDisk
                v-model="props.row.value"
                class="mb-20"
                :mode="mode"
                :disks="disks"
                :node="value"
              />
            </template>
            <template #add>
              <ButtonDropdown
                v-if="!isView"
                :button-label="t('harvester.host.disk.add')"
                :dropdown-options="blockDeviceOpts"
                size="sm"
                :selectable="selectable"
                @click-action="e=>addDisk(e.value)"
                @dd-button-action="ddButtonAction"
              >
                <template #option="option">
                  <template v-if="option.kind === 'group'">
                    <b>
                      {{ option.label }}
                    </b>
                  </template>
                  <div v-else>
                    {{ option.label }}
                  </div>
                </template>
              </ButtonDropdown>
            </template>
            <template #remove-button="scope">
              <button
                v-if="canRemove(scope.row, scope.i) && !isView"
                type="button"
                class="btn role-link close btn-sm"
                @click="() => onRemove(scope)"
              >
                <i class="icon icon-x" />
              </button>
              <span v-else />
            </template>
          </ArrayListGrouped>
        </Tab>
        <Tab v-if="hasKsmtunedSchema" name="Ksmtuned" :weight="70" :label="t('harvester.host.tabs.ksmtuned')">
          <HarvesterKsmtuned :mode="mode" :node="value" :register-before-hook="registerBeforeHook" />
        </Tab>
        <Tab
          v-if="hasAddonSchema"
          name="seeder"
          :weight="60"
          :label="t('harvester.host.tabs.seeder')"
        >
          <HarvesterSeeder
            v-if="seederEnabled && hasInventorySchema"
            :mode="mode"
            :node="value"
            :register-after-hook="registerAfterHook"
            :inventory="inventory"
          />
          <div v-else-if="seederEnabled && !hasInventorySchema">
            <Banner
              color="info"
              :label="t('harvester.seeder.banner.noInventory')"
            />
          </div>
          <div v-else>
            <Banner
              v-if="hasSeederAddon"
              color="info"
            >
              <MessageLink
                :to="toEnableSeederAddon"
                prefix-label="harvester.seeder.banner.enable.prefix"
                middle-label="harvester.seeder.banner.enable.middle"
                suffix-label="harvester.seeder.banner.enable.suffix"
              />
            </Banner>
            <Banner
              v-else
              color="warning"
              :label="t('harvester.seeder.banner.noAddon')"
            />
          </div>
        </Tab>
        <Tab name="labels" label-key="harvester.host.tabs.labels">
          <KeyValue
            key="labels"
            :value="filteredLabels"
            :add-label="t('labels.addLabel')"
            :mode="mode"
            :read-allowed="false"
            :value-can-be-empty="true"
            @input="updateHostLabels"
          />
        </Tab>
      </Tabbed>
      <Banner
        v-if="showFormattedWarning"
        color="warning"
        :label="t('harvester.host.disk.forceFormatted.toolTip')"
      />
    </div>

    <Footer class="footer" :mode="mode" :errors="errors" @save="save" @done="done" />
  </div>
</template>
<style lang="scss" scoped>
#node {
  display: flex;
  flex-grow: 1;
  flex-direction: column;

  .content {
    flex-grow: 1
  }

  .wrapper{
    position: relative;
  }
  .nicOption {
    display: flex;
    justify-content: space-between;
  }
}

</style>
