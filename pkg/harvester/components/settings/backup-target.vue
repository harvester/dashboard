<script>
import Tip from '@shell/components/Tip';
import { HCI_SETTING } from '../../config/settings';
import Password from '@shell/components/form/Password';
import MessageLink from '@shell/components/MessageLink';
import CreateEditView from '@shell/mixins/create-edit-view';
import { LabeledInput } from '@components/Form/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import UnitInput from '@shell/components/form/UnitInput';

export default {
  name: 'HarvesterEditBackupTarget',

  components: {
    LabeledInput, LabeledSelect, Tip, Password, MessageLink, UnitInput
  },

  mixins: [CreateEditView],

  data() {
    let parseDefaultValue = {};

    try {
      parseDefaultValue = JSON.parse(this.value.value);
    } catch (error) {
      parseDefaultValue = {
        type: '', endpoint: '', refreshIntervalInSeconds: 0
      };
    }

    if (!parseDefaultValue.type) {
      parseDefaultValue.type = 's3';
    }

    return {
      parseDefaultValue,
      errors: []
    };
  },

  computed: {
    typeOption() {
      return [{
        value: 'nfs',
        label: 'NFS'
      }, {
        value: 's3',
        label: 'S3'
      }];
    },

    virtualHostedStyleType() {
      return [{
        value: true,
        label: 'True'
      }, {
        value: false,
        label: 'False'
      }];
    },

    isS3() {
      return this.parseDefaultValue.type === 's3';
    },

    endpointPlaceholder() {
      return this.isS3 ? '' : 'nfs://server:/path/';
    },

    toCA() {
      return `${ HCI_SETTING.ADDITIONAL_CA }?mode=edit`;
    }
  },

  watch: {
    value: {
      handler(neu) {
        let parseDefaultValue;

        try {
          parseDefaultValue = JSON.parse(neu.value);
        } catch (err) {
          parseDefaultValue = {
            type: '', endpoint: '', refreshIntervalInSeconds: 0
          };
        }

        this.$set(this, 'parseDefaultValue', parseDefaultValue);
        this.update();
      },
      deep: true
    }
  },

  created() {
    this.update();
  },

  methods: {
    update() {
      if (!this.isS3) {
        delete this.parseDefaultValue.accessKeyId;
        delete this.parseDefaultValue.secretAccessKey;
        delete this.parseDefaultValue.bucketName;
        delete this.parseDefaultValue.bucketRegion;
        delete this.parseDefaultValue.virtualHostedStyle;
        delete this.parseDefaultValue.cert;
      }

      const value = JSON.stringify(this.parseDefaultValue);

      if (!this.parseDefaultValue.type) {
        this.$delete(this.value, 'value');
      } else {
        this.$set(this.value, 'value', value);
      }
    },

    useDefault() {
      const parseDefaultValue = {
        type: '', endpoint: '', refreshIntervalInSeconds: 0
      };

      this.$set(this, 'parseDefaultValue', parseDefaultValue);
    }
  }
};
</script>

<template>
  <div class="row" @input="update">
    <div class="col span-12">
      <LabeledSelect v-model="parseDefaultValue.type" class="mb-20" :label="t('harvester.fields.type')" :options="typeOption" @input="update" />
      <UnitInput
        v-model="parseDefaultValue.refreshIntervalInSeconds"
        :suffix="parseDefaultValue.refreshIntervalInSeconds <= 1 ? 'Second' : 'Seconds'"
        :label="t('harvester.backup.refreshInterval.label')"
        :mode="mode"
        :positive="true"
        class="mb-5"
        required
        @input="update"
      />
      <Tip
        class="mb-20"
        icon="icon icon-info"
        :text="t('harvester.backup.refreshInterval.tip')"
      />
      <LabeledInput v-model="parseDefaultValue.endpoint" class="mb-5" :placeholder="endpointPlaceholder" :mode="mode" label="Endpoint" />
      <Tip class="mb-20" icon="icon icon-info" :text="t('harvester.backup.backupTargetTip')" />

      <template v-if="isS3">
        <LabeledInput
          v-model="parseDefaultValue.bucketName"
          class="mb-20"
          :mode="mode"
          label="Bucket Name"
          required
        />

        <LabeledInput
          v-model="parseDefaultValue.bucketRegion"
          class="mb-20"
          :mode="mode"
          label="Bucket Region"
          required
        />

        <LabeledInput
          v-model="parseDefaultValue.accessKeyId"
          :placeholder="t('harvester.setting.placeholder.accessKeyId')"
          class="mb-20"
          :mode="mode"
          label="Access Key ID"
          required
        />

        <Password
          v-model="parseDefaultValue.secretAccessKey"
          class="mb-20"
          :mode="mode"
          :placeholder="t('harvester.setting.placeholder.secretAccessKey')"
          label="Secret Access Key"
          required
        />

        <LabeledSelect v-model="parseDefaultValue.virtualHostedStyle" class="mb-20" label="Virtual Hosted-Style" :options="virtualHostedStyleType" @input="update" />

        <div class="mb-20">
          <Tip icon="icon icon-info">
            <MessageLink
              :to="toCA"
              target="_blank"
              prefix-label="harvester.setting.message.ca.prefix"
              middle-label="harvester.setting.message.ca.middle"
              suffix-label="harvester.setting.message.ca.suffix"
            />
          </Tip>
        </div>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
p {
  display: flex;
  align-items: center;
}
.icon-h-question {
  font-size: 24px;
}
.tip {
  font-size: 15px;
}

.goCA {
  margin: 0 3px;
}
</style>
