<script>
import CopyToClipboardText from '@shell/components/CopyToClipboardText';
import { isMaybeSecure } from '@shell/utils/url';

export default {
  components: { CopyToClipboardText },

  props: {
    row: {
      type:     Object,
      required: true,
    },
    col: {
      type:     Object,
      required: true,
    },
  },

  computed: {
    parsed() {
      const row = this.row || {};
      const listeners = row?.spec?.listeners || [];
      const out = [];
      const address = row.status?.address;

      if (!address) {
        return;
      }

      if (listeners.length > 0) {
        listeners.forEach((p) => {
          let proxyUrl;

          const hidePort = [80, 443].includes(p.port);

          if (p?.protocol === 'TCP' && hidePort) {
            if (isMaybeSecure(p.port, p?.protocol)) {
              proxyUrl = `https://${ address }:${ p.port }`;
            } else {
              proxyUrl = `http://${ address }:${ p.port }`;
            }
          } else {
            proxyUrl = `http://${ address }:${ p.port }`;
          }

          let label = address;

          if (!hidePort) {
            label = `${ address }:${ p.port }`;
          }

          const html = `<a href="${ proxyUrl }" target="_blank" rel="noopener noreferrer nofollow">${ label }</a>`;

          out.push({ html, label });
        });
      } else {
        out.push({ html: address, label: address });
      }

      return out;
    },
  },
};
</script>>

<template>
  <div>
    <div
      v-for="(port, index) in parsed"
      :key="index"
    >
      <CopyToClipboardText :text="port.label" />
    </div>
  </div>
</template>
