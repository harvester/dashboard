<script>
import { formatSi, parseSi } from '@shell/utils/units';

export default {
  props: {
    value: {
      type:    [Number, String],
      default: () => 0,
    },

    opts: {
      type:    Object,
      default: () => {},
    },

    needParseSi: {
      type:    Boolean,
      default: false
    }
  },
  computed: {
    formattedValue() {
      let parseValue = this.value;

      if (this.needParseSi) {
        parseValue = parseSi(this.value);
      }

      return formatSi(parseValue, {
        suffix:      'iB',
        firstSuffix: 'B',
        increment:   1024,
        ...this.opts
      });
    }
  }
};
</script>

<template>
<<<<<<< HEAD
  <span>{{ formattedValue }}</span>
=======
  <span v-if="value">{{ formattedValue }}</span>
  <span
    v-else
    class="text-muted"
  >&mdash;</span>
>>>>>>> b5455bcb (fix: separate used/allocated units)
</template>
