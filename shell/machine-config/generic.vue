<script>
import Loading from '@shell/components/Loading';
import { Banner } from '@components/Banner';
import CreateEditView from '@shell/mixins/create-edit-view';
import { exceptionToErrorsArray, stringify } from '@shell/utils/error';
import Questions from '@shell/components/Questions';

export default {
  components: {
    Loading, Banner, Questions
  },

  mixins: [CreateEditView],

  props: {
    credentialId: {
      type:     String,
      required: true,
    },

    provider: {
      type:     String,
      required: true,
    },

    disabled: {
      type:    Boolean,
      default: false
    },
  },

<<<<<<< HEAD
  fetch() {
    this.errors = [];

    try {
      this.fields = this.$store.getters['plugins/fieldsForDriver'](this.provider);
=======
  async fetch() {
    this.errors = [];

    try {
      this.fields = await this.$store.getters['plugins/fieldsForDriver'](this.provider);
>>>>>>> b5455bcb (fix: separate used/allocated units)
      const name = `rke-machine-config.cattle.io.${ this.provider }config`;

      if ( !this.fields ) {
        throw new Error(`Machine Driver config schema not found for ${ name }`);
      }
    } catch (e) {
      this.errors = exceptionToErrorsArray(e);
    }
<<<<<<< HEAD
=======

    const normanType = this.$store.getters['plugins/credentialFieldForDriver'](this.provider);
    const normanSchema = this.$store.getters['rancher/schemaFor'](`${ normanType }credentialconfig`);

    if ( normanSchema ) {
      this.cloudCredentialKeys = Object.keys(normanSchema.resourceFields || {});
    } else {
      this.cloudCredentialKeys = await this.$store.getters['plugins/fieldNamesForDriver'](this.provider);
    }
>>>>>>> b5455bcb (fix: separate used/allocated units)
  },

  data() {
    return {
      errors: null,
      fields: null,
    };
  },

<<<<<<< HEAD
  computed: {
    cloudCredentialKeys() {
      const normanType = this.$store.getters['plugins/credentialFieldForDriver'](this.provider);
      const normanSchema = this.$store.getters['rancher/schemaFor'](`${ normanType }credentialconfig`);

      if ( normanSchema ) {
        return Object.keys(normanSchema.resourceFields || {});
      } else {
        return this.$store.getters['plugins/fieldNamesForDriver'](this.provider);
      }
    }
  },

=======
>>>>>>> b5455bcb (fix: separate used/allocated units)
  watch: {
    'credentialId'() {
      this.$fetch();
    },
  },

  methods: { stringify },
};
</script>

<template>
  <Loading
    v-if="$fetchState.pending"
    :delayed="true"
  />
  <div v-else-if="errors.length">
    <div
      v-for="(err, idx) in errors"
      :key="idx"
    >
      <Banner
        color="error"
        :label="stringify(err)"
      />
    </div>
  </div>
  <div v-else>
    <Questions
      v-model="value"
      :mode="mode"
      :tabbed="false"
      :source="fields"
      :ignore-variables="cloudCredentialKeys"
      :target-namespace="value.metadata.namespace"
      :disabled="disabled"
    />
  </div>
</template>
