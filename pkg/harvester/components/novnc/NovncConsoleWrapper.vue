<script>
import { STEVE } from '@shell/config/types';
import { escapeHtml } from '@shell/utils/string';
import { allHash } from '@shell/utils/promise';
import KeyTable from '@novnc/novnc/core/input/keysym';
import * as KeyboardUtil from '@novnc/novnc/core/input/util';
import NovncConsole from './NovncConsole';
import NovncConsoleItem from './NovncConsoleItem';
import NovncConsoleCustomKeys from './NovncConsoleCustomKeys';
import { HCI } from '../../types';

const PREFERED_SHORTCUT_KEYS = 'prefered-shortcut-keys';

const SHORT_KEYS = {
  ControlLeft: {
    label: 'Ctrl',
    value: KeyTable.XK_Control_L,
  },
  AltLeft: {
    label: 'Alt',
    value: KeyTable.XK_Alt_L,
  }
};

const FUNCTION_KEYS = {
  Delete: {
    label: 'Del',
    value: KeyTable.XK_Delete,
  },
  PrintScreen: {
    label: 'Print Screen',
    value: KeyTable.XK_Print,
  },
};

const NORMAL_KEYS = {
  KeyN: {
    label: 'N',
    value: KeyTable.XK_n,
  },
  KeyT: {
    label: 'T',
    value: KeyTable.XK_t,
  },
  KeyW: {
    label: 'W',
    value: KeyTable.XK_w,
  },
  KeyY: {
    label: 'Y',
    value: KeyTable.XK_y,
  },
};

const F_KEYS = {
  F1: {
    label: 'F1',
    value: KeyTable.XK_F1,
  },
  F2: {
    label: 'F2',
    value: KeyTable.XK_F2,
  },
  F3: {
    label: 'F3',
    value: KeyTable.XK_F3,
  },
  F4: {
    label: 'F4',
    value: KeyTable.XK_F4,
  },
  F5: {
    label: 'F5',
    value: KeyTable.XK_F5,
  },
  F6: {
    label: 'F6',
    value: KeyTable.XK_F6,
  },
  F7: {
    label: 'F7',
    value: KeyTable.XK_F7,
  },
  F8: {
    label: 'F8',
    value: KeyTable.XK_F8,
  },
  F9: {
    label: 'F9',
    value: KeyTable.XK_F9,
  },
  F10: {
    label: 'F10',
    value: KeyTable.XK_F10,
  },
  F11: {
    label: 'F11',
    value: KeyTable.XK_F11,
  },
  F12: {
    label: 'F12',
    value: KeyTable.XK_F12,
  },
};

export default {
  name:       'NovncConsoleWrapper',
  components: {
    NovncConsole, NovncConsoleItem, NovncConsoleCustomKeys
  },

  async fetch() {
    const _hash = { vmResource: this.$store.dispatch('harvester/find', { type: HCI.VM, id: this.value.id }) };

    const hash = await allHash(_hash);

    this.vmResource = hash.vmResource;
  },

  props: {
    value: {
      type:     Object,
      required: true,
      default:  () => {
        return {};
      }
    }
  },

  data() {
    return {
      keysRecord:        [],
      vmResource:        {},
      renderKeysModal:   false,
      currentUser:       null,
      hideCustomKeysBar: false,
    };
  },

  computed: {
    savedShortcutKeys() {
      const preference = this.$store.getters['management/all'](STEVE.PREFERENCE);
      const preferedShortcutKeys = preference?.[0]?.data?.[PREFERED_SHORTCUT_KEYS];
      let out = [];

      if (!preference?.[0]?.data) {
        this.hideCustomKeysBar = true;

        return out;
      }

      if (!preferedShortcutKeys) {
        return out;
      }

      try {
        out = JSON.parse(preferedShortcutKeys);
      } catch (err) {
        this.$store.dispatch('growl/fromError', {
          title: this.t('generic.notification.title.error', { name: escapeHtml(this.value.metadata.name) }),
          err,
        }, { root: true });
      }

      return out;
    },

    isDown() {
      return this.isEmpty(this.value);
    },

    url() {
      const ip = `${ window.location.hostname }:${ window.location.port }`;

      return `wss://${ ip }${ this.value?.getVMIApiPath }`;
    },

    allKeys() {
      return {
        ...SHORT_KEYS,
        ...FUNCTION_KEYS,
        ...NORMAL_KEYS,
        ...F_KEYS,
      };
    },

    keymap() {
      const out = {
        ...SHORT_KEYS,
        PrintScreen: FUNCTION_KEYS.PrintScreen,
        ...F_KEYS,
      };

      out.AltLeft.keys = { PrintScreen: FUNCTION_KEYS.PrintScreen, ...F_KEYS };
      out.ControlLeft.keys = {
        AltLeft: {
          ...Object.assign(SHORT_KEYS.AltLeft, {}),
          keys: { Delete: FUNCTION_KEYS.Delete }
        },
        ...NORMAL_KEYS,
      };

      return out;
    },

    hasSoftRebootAction() {
      return !!this.vmResource?.actions?.softreboot;
    },

    preferredShortcutKeys() {
      return (this.savedShortcutKeys || []).map((item) => {
        return {
          label: item.map(K => K.key.charAt(0).toUpperCase() + K.key.slice(1)).join('+'),
          value: item
        };
      });
    },
  },

  methods: {
    isEmpty(o) {
      return o !== undefined && Object.keys(o).length === 0;
    },

    close() {
      this.$refs.novncConsole.disconnect();
    },

    update({ key, pos }) {
      this.keysRecord.splice(pos, this.keysRecord.length - pos, key);
    },

    // Send function key, e.g. ALT + F
    sendKeys() {
      this.keysRecord.forEach((key) => {
        this.$refs.novncConsole.sendKey(this.allKeys[key].value, key, true);
      });

      this.keysRecord.reverse().forEach((key) => {
        this.$refs.novncConsole.sendKey(this.allKeys[key].value, key, false);
      });

      this.$refs.popover.isOpen = false;
      this.keysRecord = [];
    },

    sendCustomKeys(keys) {
      const keyList = [].concat(keys);

      keyList.forEach((K) => {
        this.$refs.novncConsole.sendKey(KeyboardUtil.getKeysym(K), KeyboardUtil.getKeycode(K), true);
      });

      keyList.reverse().forEach((K) => {
        this.$refs.novncConsole.sendKey(KeyboardUtil.getKeysym(K), KeyboardUtil.getKeycode(K), false);
      });
    },

    softReboot() {
      this.vmResource.softrebootVM();
    },

    showKeysModal() {
      this.renderKeysModal = true;
    },

    hideKeysModal() {
      this.renderKeysModal = false;
    },
  }
};
</script>

<template>
  <div id="app">
    <div class="vm-console">
      <div class="combination-keys">
        <v-popover
          ref="popover"
          placement="top"
          trigger="click"
          :container="false"
          @auto-hide="keysRecord = []"
        >
          <button class="btn btn-sm bg-primary">
            {{ t("harvester.virtualMachine.detail.console.shortcutKeys") }}
          </button>

          <template v-slot:popover>
            <novnc-console-item :items="keymap" :path="keysRecord" :pos="0" @update="update" @send-keys="sendKeys" />
          </template>
        </v-popover>

        <button v-if="hasSoftRebootAction" class="btn btn-sm bg-primary" @click="softReboot">
          {{ t("harvester.action.softreboot") }}
        </button>

        <v-popover
          v-if="!hideCustomKeysBar"
          ref="customKeyPopover"
          placement="top"
          trigger="click"
          :container="false"
        >
          <button class="btn btn-sm bg-primary">
            {{ t("harvester.virtualMachine.detail.console.customShortcutKeys") }}
          </button>

          <template v-slot:popover>
            <div>
              <button class="btn btn-sm bg-primary" @click="showKeysModal">
                {{ t("harvester.virtualMachine.detail.console.management") }}
              </button>
            </div>

            <hr>

            <div v-for="(keys, index) in preferredShortcutKeys" :key="index" class="mb-5">
              <button class="btn btn-sm bg-primary" @click="sendCustomKeys(keys.value)">
                {{ keys.label }}
              </button>
            </div>
          </template>
        </v-popover>

        <NovncConsoleCustomKeys
          v-if="renderKeysModal"
          :current-user="currentUser"
          @close="hideKeysModal"
        />
      </div>
      <NovncConsole v-if="url && !isDown" ref="novncConsole" :url="url" />
      <p v-if="isDown">
        {{ t("harvester.virtualMachine.detail.console.down") }}
      </p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .vm-console {
    height: 100%;
    display: grid;
    grid-template-rows: 30px auto;
  }

  .combination-keys {
    background: rgb(40, 40, 40);
  }
</style>
