<script>
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import { LabeledInput } from '@components/Form/LabeledInput';
import { RadioGroup } from '@components/Form/Radio';
import { Checkbox } from '@components/Form/Checkbox';
import { SECRET } from '@shell/config/types';
import ModalWithCard from '@shell/components/ModalWithCard';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import { base64Encode, base64Decode } from '@shell/utils/crypto';

const _NEW = '_NEW';

export default {
  name: 'HarvesterSeeder',

  components: {
    Checkbox,
    LabeledInput,
    LabeledSelect,
    RadioGroup,
    ModalWithCard,
    NameNsDescription,
  },

  props: {
    mode: {
      type:     String,
      required: true
    },

    node: {
      type:     Object,
      required: true,
    },

    registerBeforeHook: {
      type:     Function,
      required: true,
    },

    inventory: {
      type:     Object,
      required: true,
    },
  },

  data() {
    return {
      enabled:           true,
      value:             this.inventory,
      secret:            {},
      errors:            [],
      newSecretSelected: false,
    };
  },

  created() {
    this.registerBeforeHook(this.saveInventory, 'saveInventory');
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;

    this.secret = await this.$store.dispatch(`${ inStore }/create`, {
      type: SECRET,
      data: {
        username: '',
        password: '',
      },
      metadata: {
        namespace: '',
        name:      '',
        describe:  '',
      },
    });
  },

  computed: {
    secretOption() {
      const inStore = this.$store.getters['currentProduct'].inStore;

      const out = this.$store.getters[`${ inStore }/all`](SECRET).filter((s) => {
        return s.data?.username && s.data?.password;
      }).map( (s) => {
        return {
          label: s.id,
          value: s.id
        };
      });

      // if (!(this.disableCreate || this.mode === _VIEW) && this.isCreatable) {
      out.unshift({
        label: this.t('harvester.virtualMachine.createSSHKey'),
        value: _NEW,
      });
      // }

      return out;
    },

    selectedSecret: {
      get() {
        const namespace = this.value.spec?.baseboardSpec?.connection?.authSecretRef?.namespace;
        const name = this.value?.spec?.baseboardSpec?.connection?.authSecretRef?.name;

        if (namespace && name) {
          return `${ namespace }/${ name }`;
        } else {
          return '';
        }
      },

      set(value) {
        if (value === _NEW) {
          this.newSecretSelected = true;
        } else {
          const [namespace, name] = value.split('/');

          this.$set(this.value.spec.baseboardSpec.connection.authSecretRef, 'namespace', namespace);
          this.$set(this.value.spec.baseboardSpec.connection.authSecretRef, 'name', name);
        }
      },
    },

    username: {
      get() {
        return base64Decode(this.secret?.data?.username);
      },

      set(value) {
        this.$set(this.secret.data, 'username', base64Encode(value));
      }
    },

    password: {
      get() {
        return base64Decode(this.secret?.data?.password);
      },

      set(value) {
        this.$set(this.secret.data, 'password', base64Encode(value));
      }
    },
  },

  methods: {
    async saveInventory() {
      return await this.value.save();
    },

    show() {
      this.$modal.show('secretModal');
    },

    hide() {
      this.$modal.hide('secretModal');
      this.newSecretSelected = false;
    },

    cancel() {
      this.hide();
    },

    resetFields() {
      this.secret.data.username = '';
      this.secret.data.password = '';
      this.secret.metadata.name = '';
      this.secret.metadata.namespace = '';
    },

    async saveSecret(buttonCb) {
      this.errors = [];

      if (this.errors.length > 0) {
        buttonCb(false);

        return;
      }

      try {
        const res = await this.secret.save();

        if (res.id) {
          this.secretOption.push({
            label: res.id,
            value: res.id
          });
        }

        this.selectedSecret = res.id;

        buttonCb(true);
        this.cancel();
      } catch (err) {
        this.errors = [err.message];
        buttonCb(false);
      }
    }
  },

  watch: {
    newSecretSelected(val) {
      if (val) {
        this.show();
      }
    }
  }
};
</script>

<template>
  <div>
    <div v-if="enabled">
      <div class="row">
        <div class="col span-6">
          <LabeledInput
            v-model="value.spec.baseboardSpec.connection.host"
            :label="t('harvester.seeder.inventory.host.label')"
            :mode="mode"
          />
          <Checkbox
            v-model="value.spec.baseboardSpec.connection.insecureTLS"
            class="mt-5"
            :mode="mode"
            :label="t('harvester.seeder.inventory.insecureTLS.label')"
          />
        </div>
        <div class="col span-6">
          <LabeledInput
            v-model.number="value.spec.baseboardSpec.connection.port"
            :label="t('harvester.seeder.inventory.port.label')"
            :mode="mode"
          />
        </div>
      </div>
      <div class="row mt-20">
        <div class="col span-6">
          <LabeledSelect
            v-model="selectedSecret"
            :label="t('harvester.seeder.inventory.secret.label')"
            :mode="mode"
            :options="secretOption"
          />
        </div>
      </div>
      <div class="row mt-20">
        <div class="col span-6">
          <RadioGroup
            v-model="value.spec.events.enabled"
            name="enabled"
            :options="[true, false]"
            :label="t('harvester.seeder.inventory.event.label')"
            :labels="[t('generic.enabled'), t('generic.disabled')]"
            :mode="mode"
          />
        </div>
        <div
          v-if="value.spec.events.enabled"
          class="col span-6"
        >
          <LabeledInput
            v-model="value.spec.events.pollingInterval"
            :label="t('harvester.seeder.inventory.pollingInterval.label')"
            :mode="mode"
          />
        </div>
      </div>

      <ModalWithCard
        ref="secretModal"
        width="80%"
        :errors="errors"
        name="secretModal"
        @finish="saveSecret"
        @close="cancel"
      >
        <template #title>
          {{ t('harvester.seeder.inventory.secret.create.title') }}
        </template>

        <template #content>
          <NameNsDescription
            v-model="secret"
            :namespaced="true"
            mode="create"
          />

          <LabeledInput
            v-model="username"
            :label="t('harvester.virtualMachine.input.username')"
            class="mb-20"
            required
          />

          <LabeledInput
            v-model="password"
            type="password"
            :label="t('harvester.virtualMachine.input.password')"
            class="mb-20"
            required
          />
        </template>
      </ModalWithCard>
    </div>
  </div>
</template>
