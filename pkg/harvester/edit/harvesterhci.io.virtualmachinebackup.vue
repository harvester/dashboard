<script>
import Footer from '@shell/components/form/Footer';
import { RadioGroup } from '@components/Form/Radio';
import { LabeledInput } from '@components/Form/LabeledInput';
import Checkbox from '@components/Form/Checkbox/Checkbox';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import CreateEditView from '@shell/mixins/create-edit-view';
import { allHash } from '@shell/utils/promise';
import { exceptionToErrorsArray } from '@shell/utils/error';
import { HCI } from '../types';
import { sortBy } from '@shell/utils/sort';
import { clone } from '@shell/utils/object';
import { BACKUP_TYPE } from '../config/types';

const createObject = {
  apiVersion: 'harvesterhci.io/v1beta1',
  kind:       'VirtualMachineRestore',
  metadata:   { name: '', namespace: '' },
  type:       HCI.RESTORE,
  spec:       {
    target: {
      apiGroup: 'kubevirt.io',
      kind:     'VirtualMachine',
      name:     ''
    },
    virtualMachineBackupName: '',
    newVM:                    true,
    deletionPolicy:           'delete'
  }
};

export default {
  name:       'CreateRestore',
  components: {
    Checkbox,
    Footer,
    RadioGroup,
    LabeledInput,
    LabeledSelect,
  },

  mixins: [CreateEditView],

  async fetch() {
    await allHash({
      backups: this.$store.dispatch('harvester/findAll', { type: HCI.BACKUP }),
      vms:     this.$store.dispatch('harvester/findAll', { type: HCI.VM }),
    });
  },

  data() {
    const restoreMode = this.$route.query?.restoreMode;
    const backupName = this.$route.query?.resourceName;

    const restoreResource = clone(createObject);

    const restoreNewVm = restoreMode === 'new' || restoreMode === undefined;

    return {
      backupName,
      restoreNewVm,
      restoreResource,
      name:           '',
      description:    '',
      deletionPolicy: 'delete',
      namespace:      ''
    };
  },

  computed: {
    backupOption() {
      const choices = this.$store.getters['harvester/all'](HCI.BACKUP);

      return choices.filter( (T) => {
        const hasVM = this.restoreNewVm || T.attachVmExisting;

        return hasVM && T?.status?.readyToUse && T.spec?.type !== BACKUP_TYPE.SNAPSHOT;
      }).map( (T) => {
        return {
          label: T.metadata.name,
          value: T.metadata.name
        };
      });
    },

    deletionPolicyOption() {
      return [{
        value: 'delete',
        label: 'Delete'
      }, {
        value: 'retain',
        label: 'Retain'
      }];
    },

    currentBackupResource() {
      const name = this.backupName;

      const backupList = this.$store.getters['harvester/all'](HCI.BACKUP);

      return backupList.find( O => O.name === name);
    },

    disableExisting() {
      return !this.currentBackupResource?.attachVmExisting;
    },

    backupNamespace() {
      const backupList = this.$store.getters['harvester/all'](HCI.BACKUP);

      return backupList.find( B => B.metadata.name === this.backupName)?.metadata?.namespace;
    },

    namespaces() {
      const allNamespaces = this.$store.getters['allNamespaces'];

      const out = sortBy(
        allNamespaces.map((obj) => {
          return {
            label: obj.nameDisplay,
            value: obj.id,
          };
        }),
        'label'
      );

      return out;
    },
  },

  watch: {
    backupName: {
      handler(neu) {
        if (this.currentBackupResource) {
          if (!this.restoreNewVm) {
            this.name = this?.currentBackupResource?.attachVM;
          }
        }

        this.restoreResource.spec.virtualMachineBackupName = neu;
      },
      immediate: true
    },

    restoreNewVm(neu) {
      if (neu) {
        this.name = '';
      } else {
        this.name = this?.currentBackupResource?.attachVM;
      }
    },

    backupNamespace: {
      handler(neu) {
        this.namespace = neu;
      },
      immediate: true
    }
  },

  methods: {
    cancelAction() {
      this.$router.go(-1);
    },

    async saveRestore(buttonCb) {
      this.update();

      const proxyResource = await this.$store.dispatch('harvester/create', this.restoreResource);

      proxyResource.metadata.namespace = this.namespace;
      proxyResource.spec.virtualMachineBackupNamespace = this.backupNamespace;

      try {
        await proxyResource.save();
        buttonCb(true);

        this.$router.push({
          name:   this.doneRoute,
          params: { resource: HCI.VM }
        });
      } catch (err) {
        this.errors = exceptionToErrorsArray(err) || err;
        buttonCb(false);
      }
    },

    update() {
      this.restoreResource.metadata.generateName = `restore-${ this.backupName }-`;
      if (this.name) {
        this.restoreResource.spec.target.name = this.name;
      }

      if (this.restoreNewVm) {
        delete this.restoreResource.spec.deletionPolicy;
        this.restoreResource.spec.newVM = true;
      } else {
        this.restoreResource.spec.deletionPolicy = this.deletionPolicy;
        delete this.restoreResource.spec.newVM;
        delete this.restoreResource.spec.keepMacAddress;
      }
    }
  },

  componentTitle() {
    return 'restoreVM';
  }
};
</script>

<template>
  <div id="restore">
    <div class="content">
      <div class="mb-20">
        <RadioGroup
          v-model="restoreNewVm"
          name="model"
          :options="[true,false]"
          :labels="[t('harvester.backup.restore.createNew'), t('harvester.backup.restore.replaceExisting')]"
          :disabled="disableExisting"
          :mode="mode"
        />
      </div>

      <div class="row">
        <div class="col span-6">
          <LabeledSelect
            v-model="namespace"
            :disabled="!restoreNewVm"
            :label="t('nameNsDescription.namespace.label')"
            :options="namespaces"
          />
        </div>

        <div class="col span-6">
          <LabeledInput
            v-model="name"
            :disabled="!restoreNewVm"
            :label="t('harvester.backup.restore.virtualMachineName')"
            :placeholder="t('nameNsDescription.name.placeholder')"
            class="mb-20"
          />
        </div>
      </div>

      <LabeledSelect
        v-model="backupName"
        class="mb-20"
        :label="t('harvester.backup.restore.backup')"
        :options="backupOption"
      />

      <Checkbox
        v-if="restoreNewVm"
        v-model="restoreResource.spec.keepMacAddress"
        type="checkbox"
        :label="t('harvester.backup.restore.keepMacAddress')"
      />

      <LabeledSelect
        v-if="!restoreNewVm"
        v-model="deletionPolicy"
        :label="t('harvester.backup.restore.deletePreviousVolumes')"
        :options="deletionPolicyOption"
      />
    </div>

    <Footer mode="create" class="footer" :errors="errors" @save="saveRestore" @done="cancelAction" />
  </div>
</template>

<style lang="scss" scoped>
#restore {
  display: flex;
  flex-grow: 1;
  flex-direction: column;

  ::v-deep .radio-group {
    display: flex;
    .radio-container {
      margin-right: 30px;
    }
  }

  .content {
    flex-grow: 1
  }

  .footer {
    border-top: var(--header-border-size) solid var(--header-border);

    // Overrides outlet padding
    margin-left: -$space-m;
    margin-right: -$space-m;
    margin-bottom: -$space-m;
    padding: $space-s $space-m;

    ::v-deep .spacer-small {
      padding: 0px;
    }
  }
}
</style>
