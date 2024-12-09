<script>
import CreateEditView from '@shell/mixins/create-edit-view';
import KeyValue from '@shell/components/form/KeyValue';
import { Banner } from '@components/Banner';
import { simplify, iffyFields, likelyFields } from '@shell/store/plugins';
<<<<<<< HEAD

export default {
  components: { KeyValue, Banner },
  mixins:     [CreateEditView],
=======
import Loading from '@shell/components/Loading';

export default {
  components: {
    KeyValue, Banner, Loading
  },
  mixins: [CreateEditView],
>>>>>>> b5455bcb (fix: separate used/allocated units)

  props: {
    driverName: {
      type:     String,
      required: true,
    }
  },

<<<<<<< HEAD
  data() {
    let keyOptions = [];

    const normanType = this.$store.getters['plugins/credentialFieldForDriver'](this.driverName);
    const normanSchema = this.$store.getters['rancher/schemaFor'](`${ normanType }credentialconfig`);
=======
  async fetch() {
    let keyOptions = [];

    const { normanSchema } = this;
>>>>>>> b5455bcb (fix: separate used/allocated units)

    if ( normanSchema?.resourceFields ) {
      keyOptions = Object.keys(normanSchema.resourceFields);
    } else {
<<<<<<< HEAD
      keyOptions = this.$store.getters['plugins/fieldNamesForDriver'](this.driverName);
    }

    // Prepopulate empty values for keys that sound like they're cloud-credential-ey
=======
      keyOptions = await this.$store.getters['plugins/fieldNamesForDriver'](this.driverName);
    }

    this.keyOptions = keyOptions;

>>>>>>> b5455bcb (fix: separate used/allocated units)
    const keys = [];

    for ( const k of keyOptions ) {
      const sk = simplify(k);

      if ( normanSchema || likelyFields.includes(sk) || iffyFields.includes(sk) ) {
        keys.push(k);
      }
    }

    for ( const k of keys ) {
      if ( !this.value.decodedData[k] ) {
        this.value.setData(k, '');
      }
    }
<<<<<<< HEAD

    return {
      hasSupport: !!normanSchema,
      keyOptions,
      errors:     null,
=======
  },

  data() {
    const normanType = this.$store.getters['plugins/credentialFieldForDriver'](this.driverName);
    const normanSchema = this.$store.getters['rancher/schemaFor'](`${ normanType }credentialconfig`);

    return {
      hasSupport: !!normanSchema,
      errors:     null,
      normanSchema,
>>>>>>> b5455bcb (fix: separate used/allocated units)
    };
  },

  watch: {
    'value.decodedData'(neu) {
      this.$emit('validationChanged', !!neu);
    }
  },

  methods: {
    update(val) {
      this.value.setData(val);
    }
  },

};
</script>

<template>
<<<<<<< HEAD
  <div>
=======
  <Loading v-if="$fetchState.pending" />
  <div v-else>
>>>>>>> b5455bcb (fix: separate used/allocated units)
    <Banner
      v-if="!hasSupport"
      color="info"
      label-key="cluster.selectCredential.genericDescription"
      class="mt-0"
    />
    <KeyValue
      :value="value.decodedData"
      :key-options="hasSupport || !keyOptions.length ? null : keyOptions"
      :key-editable="!hasSupport"
      :mode="mode"
      :read-allowed="true"
      :add-allowed="!hasSupport"
      :remove-allowed="!hasSupport"
      :initial-empty-row="true"
      @input="update"
    />
  </div>
</template>
