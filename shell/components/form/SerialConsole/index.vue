<script>
import { allHash } from '@shell/utils/promise';
import debounce from 'lodash/debounce';
import { Banner } from '@components/Banner';

import Socket, {
  EVENT_CONNECTED,
  EVENT_CONNECTING,
  EVENT_DISCONNECTED,
  EVENT_MESSAGE,
  EVENT_CONNECT_ERROR,
} from '@shell/utils/socket';

export default {
  components: { Banner },
  props:      {
    value: {
      type:     Object,
      required: true,
    },
  },

  data() {
    return {
      socket:         null,
      terminal:       null,
      fitAddon:       null,
      searchAddon:    null,
      webglAddon:     null,
      isOpen:         false,
      isOpening:      false,
      backlog:        [],
      firstTime:      true,
      queue:          [],
      url:            '',
      displayWarning: false
    };
  },

  computed: {
    xtermConfig() {
      return {
        cursorBlink:  true,
        useStyle:     true,
        fontSize:     12,
      };
    },

    warningLabel() {
      return !this.value ? 'serial console is temporarily unavailable, please check if vm is in running state' : this.t('serialConsole.error.message');
    }
  },

  watch: {
    queue: {
      handler: debounce(async function(neu) {
        if (neu.length === 0) {
          return;
        }

        const msg = await Promise.all(neu);

        (msg || []).forEach((m) => {
          this.terminal.write(m);
        });

        this.queue = [];
      }, 5)
    },
  },

  beforeDestroy() {
    this.close();
  },

  async mounted() {
    await this.setupTerminal();
    await this.connect();
  },

  methods: {
    async setupTerminal() {
      const docStyle = getComputedStyle(document.querySelector('body'));
      const xterm = await import(/* webpackChunkName: "xterm" */ 'xterm');

      const addons = await allHash({
        fit:      import(/* webpackChunkName: "xterm" */ 'xterm-addon-fit'),
        webgl:    import(/* webpackChunkName: "xterm" */ 'xterm-addon-webgl'),
        weblinks: import(/* webpackChunkName: "xterm" */ 'xterm-addon-web-links'),
        search:   import(/* webpackChunkName: "xterm" */ 'xterm-addon-search'),
      });

      const terminal = new xterm.Terminal({
        theme: {
          background: docStyle.getPropertyValue('--terminal-bg').trim(),
          cursor:     docStyle.getPropertyValue('--terminal-cursor').trim(),
          foreground: docStyle.getPropertyValue('--terminal-text').trim()
        },
        ...this.xtermConfig,
      });

      this.fitAddon = new addons.fit.FitAddon();
      this.searchAddon = new addons.search.SearchAddon();

      try {
        this.webglAddon = new addons.webgl.WebGlAddon();
      } catch (e) {
        // Some browsers (Safari) don't support the webgl renderer, so don't use it.
        this.webglAddon = null;
      }

      terminal.loadAddon(this.fitAddon);
      terminal.loadAddon(this.searchAddon);
      terminal.loadAddon(new addons.weblinks.WebLinksAddon());
      terminal.open(this.$refs.xterm);

      if ( this.webglAddon ) {
        terminal.loadAddon(this.webglAddon);
      }

      this.fit();
      this.flush();

      terminal.onData((input) => {
        const msg = this.str2ab(input);

        this.write(msg);
      });

      this.terminal = terminal;
    },

    str2ab(str) {
      const enc = new TextEncoder();

      return enc.encode(str);
    },

    write(msg) {
      if ( this.isOpen ) {
        this.socket.send(msg);
      } else {
        this.backlog.push(msg);
      }
    },

    clear() {
      this.terminal.clear();
    },

    getSocketUrl() {
      return `${ this.value?.getSerialConsolePath }`;
    },

    async connect() {
      if ( this.socket ) {
        await this.socket.disconnect();
        this.socket = null;
        this.terminal.reset();
      }

      this.url = this.getSocketUrl();
      if ( !this.url || !this.value) {
        return;
      }

      this.socket = new Socket(this.url, true, 0);

      this.socket.addEventListener(EVENT_CONNECTING, (e) => {
        this.displayWarning = (this.isOpening || !this.value) && this.socket?.tries;
        this.isOpen = false;
        this.isOpening = true;
      });

      this.socket.addEventListener(EVENT_CONNECT_ERROR, (e) => {
        this.isOpen = false;
        this.isOpening = false;
        console.error('Connect Error', e); // eslint-disable-line no-console
      });

      this.socket.addEventListener(EVENT_CONNECTED, (e) => {
        this.displayWarning = false;
        this.isOpen = true;
        this.isOpening = false;
        if (this.show) {
          this.fit();
          this.flush();
        }

        if (this.firstTime) {
          this.socket.send(this.str2ab('\n'));
          this.firstTime = false;
        }
      });

      this.socket.addEventListener(EVENT_DISCONNECTED, (e) => {
        this.isOpen = false;
        this.isOpening = false;
        this.$emit('close');
      });

      this.socket.addEventListener(EVENT_MESSAGE, (e) => {
        this.queue.push(e.detail.data.text());
      });

      this.socket.connect();
      this.terminal.focus();
    },

    flush() {
      const backlog = this.backlog.slice();

      this.backlog = [];

      for ( const data of backlog ) {
        this.socket.send(data);
      }
    },

    fit() {
      if ( !this.fitAddon ) {
        return;
      }

      this.fitAddon.fit();

      const { rows, cols } = this.fitAddon.proposeDimensions();

      if ( !this.isOpen ) {
        return;
      }

      const message = JSON.stringify({
        Width:  cols,
        Height: rows
      });

      this.socket.send(this.str2ab(message));
    },

    close() {
      if ( this.socket ) {
        this.socket.disconnect();
      }

      if ( this.terminal ) {
        this.terminal.dispose();
      }
    },
  },
};
</script>

<template>
  <div class="harvester-shell-container">
    <Banner v-if="displayWarning" color="error" :label="warningLabel" />
    <div ref="xterm" class="shell-body" />
    <resize-observer @notify="fit" />
  </div>
</template>

<style lang="scss" scoped>
  ::v-deep .banner.error {
    margin: 0px;
    border-left: 0px;
    text-align: center;
  }
</style>

<style lang="scss">
  @import '@/node_modules/xterm/css/xterm.css';

  body, #__nuxt, #__layout, MAIN {
    height: 100%;
  }

  .harvester-shell-container {
    height: 100%;
    overflow: hidden;

    .shell-body, .terminal.xterm {
      height: 100%;
    }
  }
</style>
