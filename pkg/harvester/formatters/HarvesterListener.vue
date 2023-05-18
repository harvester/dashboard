<script>
import { isMaybeSecure } from '@shell/utils/url';

export default {
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

          const stringPort = p.port.toString();

          if (p?.protocol === 'TCP' && (stringPort.endsWith('80') || stringPort.endsWith('443'))) {
            if (isMaybeSecure(p.port, p?.protocol)) {
              proxyUrl = `https://${ address }:${ p.port }`;
            } else {
              proxyUrl = `http://${ address }:${ p.port }`;
            }
          } else {
            proxyUrl = `http://${ address }:${ p.port }`;
          }

          let label = address;
          const hidePort = stringPort.endsWith('80') || stringPort.endsWith('443');

          if (!hidePort) {
            label = `${ address }:${ p.port }`;
          }

          const html = `<a href="${ proxyUrl }" target="_blank" rel="noopener noreferrer nofollow">${ label }</a>`;

          out.push({ html });
        });
      } else {
        out.push({ html: address });
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
      <span v-html="port.html" />
    </div>
  </div>
</template>
