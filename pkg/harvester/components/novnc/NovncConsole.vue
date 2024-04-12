<template>
  <div>
    <div v-if="connected && disconnected">
      <main class="main-layout error">
        <div class="text-center">
          <BrandImage file-name="error-desert-landscape.svg" width="900" height="300" />
          <h1>
            {{ t('generic.notification.title.warning') }}
          </h1>
          <h2 class="text-secondary mt-20">
            {{ t('vncConsole.error.message') }}
          </h2>
        </div>
      </main>
    </div>
    <div v-if="reconnecting">
      <main class="main-layout">
        <div class="text-center">
          <h2 class="text-secondary mt-20">
            {{ t('vncConsole.reconnecting.message') }}：{{ retryTimes }} of {{ maximumRetryTimes }}
          </h2>
        </div>
      </main>
    </div>
    <div
      ref="view"
    />
  </div>
</template>

<script>
import RFB from '@novnc/novnc/core/rfb';
import BrandImage from '@shell/components/BrandImage';

export default {
  props: {
    url: {
      type:    String,
      default: ''
    }
  },

  components: { BrandImage },

  data() {
    return {
      rfb:               null,
      connected:         false,
      disconnected:      false,
      reconnectDelay:    3000,
      reconnecting:      false,
      maximumRetryTimes: 10,
      retryTimes:        0,
      setTimeout:        null,
    };
  },

  mounted() {
    this.$nextTick(() => {
      this.connect();
    });
  },

  beforeDestroy() {
    this.clearTimeout();
  },

  methods: {
    connect() {
      const rfb = new RFB(this.$refs.view, this.url);

      rfb.addEventListener('connect', () => {
        this.clearTimeout();

        this.connected = true;
        this.retryTimes = 0;
        this.reconnecting = false;
      });

      rfb.addEventListener('disconnect', (e) => {
        this.clearTimeout();

        this.disconnected = true;
        this.rfb = null;
        this.reconnect();
      });

      this.rfb = rfb;
    },

    reconnect() {
      if (this.retryTimes >= this.maximumRetryTimes) {
        this.reconnecting = false;
        this.connected = true;
        this.disconnected = true;

        return;
      }

      this.retryTimes += 1;
      this.reconnecting = true;
      this.connected = false;
      this.disconnected = false;

      this.setTimeout = setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    },

    clearTimeout() {
      if (this.setTimeout) {
        clearTimeout(this.setTimeout);
      }
    },

    disconnect() {
      this.rfb.disconnect();
    },

    ctrlAltDelete() {
      this.rfb.sendCtrlAltDel();
    },

    sendKey(keysym, code, down) {
      this.rfb.sendKey(keysym, code, down);
    }
  }
};
</script>

<style lang="scss" scoped>
  .error {
    overflow: hidden;

    .row {
      align-items: center;
    }

    h1 {
      font-size: 5rem;
    }

    .desert-landscape {
      img {
        max-width: 100%;
      }
    }
  }
</style>
