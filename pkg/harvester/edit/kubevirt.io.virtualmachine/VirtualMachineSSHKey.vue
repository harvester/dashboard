<script>
import { mapGetters } from 'vuex';
import { randomStr } from '@shell/utils/string';

import { LabeledInput } from '@components/Form/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import ModalWithCard from '@shell/components/ModalWithCard';

import { HCI } from '../../types';
import { clone } from '@shell/utils/object';
import { _VIEW } from '@shell/config/query-params';

import { NAMESPACE } from '@shell/config/types';

const _NEW = '_NEW';

export default {
  components: {
    LabeledInput,
    ModalWithCard,
    LabeledSelect,
  },

  props: {
    value: {
      type:    Array,
      default: () => {
        return [];
      }
    },

    mode: {
      type:    String,
      default: 'create',
    },

    disableCreate: {
      type:    Boolean,
      default: false
    },

    namespace: {
      type:    String,
      default: ''
    },

    createNamespace: {
      type:    Boolean,
      default: false,
    },

    searchable: {
      type:    Boolean,
      default: true,
    },

    disabled: {
      type:    Boolean,
      default: false
    }
  },

  data() {
    return {
      checkedSsh: this.value,
      publicKey:  '',
      sshName:    '',
      randomStr:  randomStr(5).toLowerCase(),
      errors:     [],
      isAll:      false,
      checkAll:   false,
      showModal:  false
    };
  },

  computed: {
    ...mapGetters({ t: 'i18n/t' }),

    schema() {
      return this.$store.getters['harvester/schemaFor']( HCI.SSH );
    },

    isCreatable() {
      if ( this.schema && !this.schema?.collectionMethods.find(x => ['blocked-post', 'post'].includes(x.toLowerCase())) ) {
        return false;
      }

      return true ;
    },

    sshOption() {
      const out = this.$store.getters['harvester/all'](HCI.SSH).map( (O) => {
        return {
          label: O.id,
          value: O.id
        };
      });

      if (!(this.disableCreate || this.mode === _VIEW) && this.isCreatable) {
        out.unshift({
          label: this.t('harvester.virtualMachine.createSSHKey'),
          value: _NEW,
        });
      }

      return out;
    },
  },

  watch: {
    publicKey(neu) {
      const trimNeu = neu.trim();
      const splitSSH = trimNeu.split(/\s+/);

      if (splitSSH.length === 3 && !this.sshName) {
        const keyComment = splitSSH[2];

        this.randomStr = randomStr(10).toLowerCase();
        this.sshName = keyComment.includes('@') ? keyComment.split('@')[0] : keyComment;
      }
    },

    value(neu) {
      this.checkedSsh = neu;
    },

    checkedSsh(val, old) {
      if ( val.includes(_NEW)) {
        this.$set(this, 'checkedSsh', old);
        this.update();
        this.show();
      }
    }
  },

  methods: {
    show() {
      this.showModal = true;
    },

    hide() {
      this.showModal = false;
    },

    async createNamespaceIfNeeded() {
      if (!this.createNamespace || this.disableCreate) {
        return;
      }

      const namespaces = await this.$store.dispatch('harvester/findAll', { type: NAMESPACE });

      const exists = namespaces?.find(n => n.name === this.namespace);

      if (!exists) {
        const ns = await this.$store.dispatch('harvester/createNamespace', { name: this.namespace }, { root: true });

        ns.applyDefaults();
        await ns.save();
      }
    },

    async createSSHKey() {
      const sshValue = await this.$store.dispatch('harvester/create', {
        metadata: {
          name:      this.sshName,
          namespace: this.namespace
        },
        spec: { publicKey: this.publicKey },
        type: HCI.SSH
      });

      const res = await sshValue.save();

      if (res.id) {
        this.checkedSsh.push(`${ this.namespace }/${ this.sshName }`);
      }
    },

    async save(buttonCb) {
      this.errors = [];

      if (!this.sshName) {
        const fieldName = this.t('harvester.virtualMachine.input.name');
        const message = this.t('validation.required', { key: fieldName });

        this.errors.push(message);
      }

      if (!this.publicKey) {
        const fieldName = this.t('harvester.virtualMachine.input.sshKeyValue');
        const message = this.t('validation.required', { key: fieldName });

        this.errors.push(message);
      }

      if (this.sshName.length > 63) {
        const message = this.t('harvester.validation.custom.tooLongName', { max: 63 });

        this.errors.push(message);
      }

      if (this.errors.length > 0) {
        buttonCb(false);

        return;
      }

      try {
        await this.createNamespaceIfNeeded();

        await this.createSSHKey();

        buttonCb(true);
        this.cancel();
      } catch (err) {
        this.errors = [err.message];
        buttonCb(false);
      }
    },

    cancel() {
      this.hide();
      this.resetFields();
    },

    resetFields() {
      this.sshName = '';
      this.publicKey = '';
      this.errors = [];
    },

    update() {
      this.$emit('update:sshKey', clone(this.checkedSsh));
    },
  }
};
</script>

<template>
  <div>
    <LabeledSelect
      v-model="checkedSsh"
      :label="t('harvester.virtualMachine.input.sshKey')"
      :taggable="true"
      :mode="mode"
      :multiple="true"
      :searchable="searchable"
      :disabled="disabled"
      :options="sshOption"
      @input="update"
    />

    <ModalWithCard
      v-if="showModal"
      :ref="randomStr"
      :name="randomStr"
      width="40%"
      :errors="errors"
      @finish="save"
      @close="cancel"
    >
      <template #title>
        {{ t('harvester.virtualMachine.sshTitle') }}
      </template>

      <template #content>
        <LabeledInput
          v-model="sshName"
          :label="t('harvester.virtualMachine.input.name')"
          class="mb-20"
          required
          @keydown.native.enter.prevent="()=>{}"
        />

        <LabeledInput
          v-model="publicKey"
          :label="t('harvester.virtualMachine.input.sshKeyValue')"
          :min-height="160"
          class="mb-20"
          type="multiline"
          required
        />
      </template>
    </ModalWithCard>
  </div>
</template>
