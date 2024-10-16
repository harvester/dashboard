import YAML from 'yaml';
import jsyaml from 'js-yaml';
import isEqual from 'lodash/isEqual';
import isEmpty from 'lodash/isEmpty';
import difference from 'lodash/difference';

import { sortBy } from '@shell/utils/sort';
import { set } from '@shell/utils/object';

import { allHash } from '@shell/utils/promise';
import { randomStr } from '@shell/utils/string';
import { base64Decode } from '@shell/utils/crypto';
import { formatSi, parseSi } from '@shell/utils/units';
import {
  ADD_ONS, SOURCE_TYPE, ACCESS_CREDENTIALS, maintenanceStrategies, runStrategies
} from '../../config/harvester-map';
import { _CLONE, _CREATE, _VIEW } from '@shell/config/query-params';
import {
  PV, PVC, STORAGE_CLASS, NODE, SECRET, CONFIG_MAP, NETWORK_ATTACHMENT, NAMESPACE, LONGHORN
} from '@shell/config/types';
import { HCI } from '../../types';
import { HCI_SETTING } from '../../config/settings';
import { HOSTNAME } from '@shell/config/labels-annotations';
import { HCI as HCI_ANNOTATIONS } from '@pkg/harvester/config/labels-annotations';
import impl, { QGA_JSON, USB_TABLET } from './impl';
import { uniq } from '@shell/utils/array';
import { parseVolumeClaimTemplates } from '../../utils/vm';

const LONGHORN_V2_DATA_ENGINE = 'longhorn-system/v2-data-engine';

export const MANAGEMENT_NETWORK = 'management Network';

export const OS = [{
  label: 'Windows',
  value: 'windows'
}, {
  label: 'Linux',
  value: 'linux'
}, {
  label: 'SUSE Linux Enterprise',
  value: 'SLEs'
}, {
  label: 'Debian',
  value: 'debian'
}, {
  label: 'Fedora',
  value: 'fedora'
}, {
  label: 'Gentoo',
  value: 'gentoo'
}, {
  label: 'Oracle',
  value: 'oracle'
}, {
  label: 'Red Hat',
  match: ['redhat', 'rhel'],
  value: 'redhat'
}, {
  label: 'openSUSE',
  value: 'openSUSE',
}, {
  label: 'Ubuntu',
  value: 'ubuntu'
}, {
  label: 'Other Linux',
  match: ['centos'],
  value: 'otherLinux'
}];

export const CD_ROM = 'cd-rom';
export const HARD_DISK = 'disk';

export default {
  mixins: [impl],

  props: {
    value: {
      type:     Object,
      required: true,
    },

    resource: {
      type:    String,
      default: ''
    }
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct'].inStore;
    const hash = {
      pvs:               this.$store.dispatch(`${ inStore }/findAll`, { type: PV }),
      pvcs:              this.$store.dispatch(`${ inStore }/findAll`, { type: PVC }),
      storageClasses:    this.$store.dispatch(`${ inStore }/findAll`, { type: STORAGE_CLASS }),
      sshs:              this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.SSH }),
      settings:          this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.SETTING }),
      images:            this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.IMAGE }),
      versions:          this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.VM_VERSION }),
      templates:         this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.VM_TEMPLATE }),
      networkAttachment: this.$store.dispatch(`${ inStore }/findAll`, { type: NETWORK_ATTACHMENT }),
      vmis:              this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.VMI }),
      vmims:             this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.VMIM }),
      vms:               this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.VM }),
      secrets:           this.$store.dispatch(`${ inStore }/findAll`, { type: SECRET }),
      addons:            this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.ADD_ONS }),
      longhornV2Engine:  this.$store.dispatch(`${ inStore }/find`, { type: LONGHORN.SETTINGS, id: LONGHORN_V2_DATA_ENGINE }),
    };

    if (this.$store.getters[`${ inStore }/schemaFor`](NODE)) {
      hash.nodes = this.$store.dispatch(`${ inStore }/findAll`, { type: NODE });
    }

    if (this.$store.getters[`${ inStore }/schemaFor`](HCI.CLUSTER_NETWORK)) {
      hash.clusterNetworks = this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.CLUSTER_NETWORK });
    }

    if (this.$store.getters[`${ inStore }/schemaFor`](HCI.VLAN_CONFIG)) {
      hash.clusterNetworks = this.$store.dispatch(`${ inStore }/findAll`, { type: HCI.VLAN_CONFIG });
    }

    if (this.$store.getters[`${ inStore }/schemaFor`](LONGHORN.VOLUMES)) {
      hash.longhornVolumes = this.$store.dispatch(`${ inStore }/findAll`, { type: LONGHORN.VOLUMES });
    }

    const res = await allHash(hash);

    const hasPCISchema = !!this.$store.getters[`${ inStore }/schemaFor`](HCI.PCI_DEVICE);
    const hasSRIOVGPUSchema = !!this.$store.getters[`${ inStore }/schemaFor`](HCI.SR_IOVGPU_DEVICE);

    const enabledAddons = res.addons.reduce((acc, addon) => ({ ...acc, [addon.name]: addon.spec?.enabled }), {});

    this.enabledPCI = hasPCISchema && enabledAddons[ADD_ONS.PCI_DEVICE_CONTROLLER];
    this.enabledSriovgpu = hasSRIOVGPUSchema && enabledAddons[ADD_ONS.PCI_DEVICE_CONTROLLER] && enabledAddons[ADD_ONS.NVIDIA_DRIVER_TOOLKIT_CONTROLLER];
  },

  data() {
    const isClone = this.realMode === _CLONE;

    return {
      OS,
      isClone,
      spec:                          null,
      osType:                        'linux',
      sshKey:                        [],
      maintenanceStrategies,
      maintenanceStrategy:           'Migrate',
      runStrategies,
      runStrategy:                   'RerunOnFailure',
      installAgent:                  true,
      hasCreateVolumes:              [],
      installUSBTablet:              true,
      networkScript:                 '',
      userScript:                    '',
      imageId:                       '',
      diskRows:                      [],
      networkRows:                   [],
      machineType:                   '',
      secretName:                    '',
      secretRef:                     null,
      showAdvanced:                  false,
      deleteAgent:                   true,
      memory:                        null,
      cpu:                           '',
      reservedMemory:                null,
      accessCredentials:             [],
      efiEnabled:                    false,
      tpmEnabled:                    false,
      secureBoot:                    false,
      userDataTemplateId:            '',
      saveUserDataAsClearText:       false,
      saveNetworkDataAsClearText:    false,
      enabledPCI:                    false,
      enabledSriovgpu:               false,
      immutableMode:                 this.realMode === _CREATE ? _CREATE : _VIEW,
      terminationGracePeriodSeconds: '',
      cpuPinning:                    false,
    };
  },

  computed: {
    inStore() {
      return this.$store.getters['currentProduct'].inStore;
    },

    images() {
      return this.$store.getters[`${ this.inStore }/all`](HCI.IMAGE);
    },

    versions() {
      return this.$store.getters[`${ this.inStore }/all`](HCI.VM_VERSION);
    },

    templates() {
      return this.$store.getters[`${ this.inStore }/all`](HCI.VM_TEMPLATE);
    },

    pvcs() {
      return this.$store.getters[`${ this.inStore }/all`](PVC);
    },

    secrets() {
      return this.$store.getters[`${ this.inStore }/all`](SECRET);
    },

    filteredNamespaces() {
      return this.$store.getters['harvester/all'](NAMESPACE).filter(namespace => !namespace.isSystem);
    },

    nodes() {
      return this.$store.getters['harvester/all'](NODE);
    },

    nodesIdOptions() {
      const nodes = this.$store.getters[`${ this.inStore }/all`](NODE);

      const networkNames = this.networkRows.map(n => n.networkName);
      const vmNetworks = this.$store.getters[`${ this.inStore }/all`](NETWORK_ATTACHMENT);
      const selectedVMNetworks = networkNames.map(name => vmNetworks.find(n => n.id === name)).filter(n => n?.id);
      const clusterNetworks = uniq(selectedVMNetworks.map(n => n.clusterNetworkResource?.id));

      return nodes.filter(N => !N.isUnSchedulable).map((node) => {
        const requireLabelKeys = [];
        let isNetworkSchedule = true;

        if (clusterNetworks.length > 0) {
          clusterNetworks.map((clusterNetwork) => {
            requireLabelKeys.push(`network.harvesterhci.io/${ clusterNetwork }`);
          });
        }

        requireLabelKeys.map((requireLabelKey) => {
          if (node.metadata?.labels?.[requireLabelKey] !== 'true') {
            isNetworkSchedule = false;
          }
        });

        return {
          label:    isNetworkSchedule ? node.nameDisplay : `${ node.nameDisplay } (${ this.t('harvester.virtualMachine.scheduling.networkNotSupport') })`,
          value:    node.id,
          disabled: !isNetworkSchedule,
        };
      });
    },

    defaultStorageClass() {
      const defaultStorage = this.$store.getters[`${ this.inStore }/all`](STORAGE_CLASS).find( O => O.isDefault);

      return defaultStorage;
    },

    storageClassSetting() {
      try {
        const storageClassValue = this.$store.getters[`${ this.inStore }/all`](HCI.SETTING).find( O => O.id === HCI_SETTING.DEFAULT_STORAGE_CLASS)?.value;

        return JSON.parse(storageClassValue);
      } catch (e) {
        return {};
      }
    },

    customVolumeMode() {
      return this.storageClassSetting.volumeMode || 'Block';
    },

    customAccessMode() {
      return this.storageClassSetting.accessModes || 'ReadWriteMany';
    },

    isWindows() {
      return this.osType === 'windows';
    },

    needNewSecret() {
      // When creating a template it is always necessary to create a new secret.
      return this.resource === HCI.VM_VERSION || this.isCreate;
    },

    defaultTerminationSetting() {
      const setting = this.$store.getters[`${ this.inStore }/all`](HCI.SETTING).find( O => O.id === HCI_SETTING.VM_TERMINATION_PERIOD) || {};

      return Number(setting?.value || setting?.default);
    },

    affinityLabels() {
      return {
        namespaceInputLabel:      this.t('harvesterManager.affinity.namespaces.label'),
        namespaceSelectionLabels: [
          this.t('harvesterManager.affinity.thisPodNamespace'),
          this.t('workload.scheduling.affinity.allNamespaces'),
          this.t('harvesterManager.affinity.matchExpressions.inNamespaces')
        ],
        addLabel:               this.t('harvesterManager.affinity.addLabel'),
        topologyKeyPlaceholder: this.t('harvesterManager.affinity.topologyKey.placeholder')
      };
    },
  },

  async created() {
    await this.$store.dispatch(`${ this.inStore }/findAll`, { type: SECRET });
    this.getInitConfig({ value: this.value, init: this.isCreate });
  },

  methods: {
    getInitConfig(config) {
      const {
        value, existUserData, fromTemplate = false, init = false
      } = config;

      const vm = this.resource === HCI.VM ? value : this.resource === HCI.BACKUP ? this.value.status?.source : value.spec.vm;
      const volumeBackups = this.resource === HCI.BACKUP ? this.value.status?.volumeBackups : null;
      const spec = vm?.spec;

      if (!spec) {
        return;
      }
      const resources = spec.template.spec.domain.resources;

      // If the user is created via yaml, there may be no "resources.limits": kubectl apply -f https://kubevirt.io/labs/manifests/vm.yaml
      if (!resources?.limits || (resources?.limits && !resources?.limits?.memory && resources?.limits?.memory !== null)) {
        spec.template.spec.domain.resources = {
          ...spec.template.spec.domain.resources,
          limits: {
            ...spec.template.spec.domain.resources.limits,
            memory: spec.template.spec.domain.resources.requests.memory
          }
        };
      }

      if (!vm.metadata.labels) {
        vm.metadata.labels = {};
      }
      const maintenanceStrategy = vm.metadata.labels?.[HCI_ANNOTATIONS.VM_MAINTENANCE_MODE_STRATEGY] || 'Migrate';

      const runStrategy = spec.runStrategy || 'RerunOnFailure';
      const machineType = value.machineType;
      const cpu = spec.template.spec.domain?.cpu?.cores;
      const memory = spec.template.spec.domain.resources.limits.memory;
      const reservedMemory = vm.metadata?.annotations?.[HCI_ANNOTATIONS.VM_RESERVED_MEMORY];
      const terminationGracePeriodSeconds = spec.template.spec?.terminationGracePeriodSeconds || this.defaultTerminationSetting;

      const sshKey = this.getSSHFromAnnotation(spec) || [];

      const imageId = this.getRootImageId(vm) || '';
      const diskRows = this.getDiskRows(vm, volumeBackups);

      const networkRows = this.getNetworkRows(vm, { fromTemplate, init });
      const hasCreateVolumes = this.getHasCreatedVolumes(spec) || [];

      let { userData = undefined, networkData = undefined } = this.getCloudInitNoCloud(spec);

      if (this.resource === HCI.BACKUP) {
        const secretBackups = this.value.status?.secretBackups;

        if (secretBackups) {
          const secretNetworkData = secretBackups[0]?.data?.networkdata || '';
          const secretUserData = secretBackups[0]?.data?.userdata || '';

          userData = base64Decode(secretUserData);
          networkData = base64Decode(secretNetworkData);
        }
      }
      const osType = this.getOsType(vm) || 'linux';

      userData = this.isCreate && !existUserData && !this.isClone ? this.getInitUserData({ osType }) : userData;

      const installUSBTablet = this.isInstallUSBTablet(spec);
      const installAgent = this.hasInstallAgent(userData, osType, true);
      const efiEnabled = this.isEfiEnabled(spec);
      const tpmEnabled = this.isTpmEnabled(spec);
      const secureBoot = this.isSecureBoot(spec);
      const cpuPinning = this.isCpuPinning(spec);

      const secretRef = this.getSecret(spec);
      const accessCredentials = this.getAccessCredentials(spec);

      if (Object.prototype.hasOwnProperty.call(spec, 'running')) {
        delete spec.running;
        spec.runStrategy = 'RerunOnFailure';
      }

      this.$set(this, 'spec', spec);
      this.$set(this, 'maintenanceStrategy', maintenanceStrategy);
      this.$set(this, 'runStrategy', runStrategy);
      this.$set(this, 'secretRef', secretRef);
      this.$set(this, 'accessCredentials', accessCredentials);
      this.$set(this, 'userScript', userData);
      this.$set(this, 'networkScript', networkData);

      this.$set(this, 'sshKey', sshKey);
      this.$set(this, 'osType', osType);
      this.$set(this, 'installAgent', installAgent);

      this.$set(this, 'cpu', cpu);
      this.$set(this, 'memory', memory);
      this.$set(this, 'reservedMemory', reservedMemory);
      this.$set(this, 'machineType', machineType);
      this.$set(this, 'terminationGracePeriodSeconds', terminationGracePeriodSeconds);

      this.$set(this, 'installUSBTablet', installUSBTablet);
      this.$set(this, 'efiEnabled', efiEnabled);
      this.$set(this, 'tpmEnabled', tpmEnabled);
      this.$set(this, 'secureBoot', secureBoot);
      this.$set(this, 'cpuPinning', cpuPinning);

      this.$set(this, 'hasCreateVolumes', hasCreateVolumes);
      this.$set(this, 'networkRows', networkRows);
      this.$set(this, 'imageId', imageId);

      this.$set(this, 'diskRows', diskRows);

      this.refreshYamlEditor();
    },

    getDiskRows(vm, volBackups) {
      const namespace = vm.metadata.namespace;
      const _volumes = vm.spec.template.spec.volumes || [];
      const _disks = vm.spec.template.spec.domain.devices.disks || [];
      const _volumeClaimTemplates = parseVolumeClaimTemplates(vm);

      let out = [];

      if (_disks.length === 0) {
        let bus = 'virtio';
        let type = HARD_DISK;
        let size = '10Gi';

        const imageResource = this.images.find( I => this.imageId === I.id);

        const isIsoImage = /iso$/i.test(imageResource?.imageSuffix);
        const imageSize = Math.max(imageResource?.status?.size, imageResource?.status?.virtualSize);
        const isEncrypted = imageResource?.isEncrypted || false;
        const volumeBackups = volBackups?.find(vBackup => vBackup.volumeName === 'disk-0') || null ;

        if (isIsoImage) {
          bus = 'sata';
          type = CD_ROM;
        }

        if (imageSize) {
          let imageSizeGiB = Math.ceil(imageSize / 1024 / 1024 / 1024);

          if (!isIsoImage) {
            imageSizeGiB = Math.max(imageSizeGiB, 10);
          }
          size = `${ imageSizeGiB }Gi`;
        }

        out.push({
          id:               randomStr(5),
          source:           SOURCE_TYPE.IMAGE,
          name:             'disk-0',
          accessMode:       'ReadWriteMany', // root disk only support LHv1 volume, should be RWX
          bus,
          volumeName:       '',
          size,
          type,
          storageClassName: '',
          image:            this.imageId,
          volumeMode:       'Block',
          isEncrypted,
          volumeBackups,
        });
      } else {
        out = _disks.map( (DISK, index) => {
          const volume = _volumes.find( V => V.name === DISK.name );

          let size = '';
          let image = '';
          let source = '';
          let realName = '';
          let container = '';
          let volumeName = '';
          let accessMode = '';
          let volumeMode = '';
          let storageClassName = '';
          let hotpluggable = false;
          let dataSource = null;

          const type = DISK?.cdrom ? CD_ROM : DISK?.disk ? HARD_DISK : '';

          if (volume?.containerDisk) { // SOURCE_TYPE.CONTAINER
            source = SOURCE_TYPE.CONTAINER;
            container = volume.containerDisk.image;
          }

          if (volume.persistentVolumeClaim && volume.persistentVolumeClaim?.claimName) {
            volumeName = volume.persistentVolumeClaim.claimName;
            const DVT = _volumeClaimTemplates.find( T => T.metadata.name === volumeName);

            realName = volumeName;
            // If the DVT can be found, it cannot be an existing volume
            if (DVT) {
              // has annotation (HCI_ANNOTATIONS.IMAGE_ID) => SOURCE_TYPE.IMAGE
              if (DVT.metadata?.annotations?.[HCI_ANNOTATIONS.IMAGE_ID] !== undefined) {
                image = DVT.metadata?.annotations?.[HCI_ANNOTATIONS.IMAGE_ID];
                source = SOURCE_TYPE.IMAGE;
              } else {
                source = SOURCE_TYPE.NEW;
              }

              const dataVolumeSpecPVC = DVT?.spec || {};

              volumeMode = dataVolumeSpecPVC?.volumeMode;
              accessMode = dataVolumeSpecPVC?.accessModes?.[0];
              size = dataVolumeSpecPVC?.resources?.requests?.storage || '10Gi';
              storageClassName = dataVolumeSpecPVC?.storageClassName;
              dataSource = dataVolumeSpecPVC?.dataSource;
            } else {
              // SOURCE_TYPE.ATTACH_VOLUME
              // Compatible with VMS that have been created before, Because they're not saved in the annotation
              const allPVCs = this.$store.getters['harvester/all'](PVC);
              const pvcResource = allPVCs.find( O => O.id === `${ namespace }/${ volume?.persistentVolumeClaim?.claimName }`);

              source = SOURCE_TYPE.ATTACH_VOLUME;
              accessMode = pvcResource?.spec?.accessModes?.[0] || 'ReadWriteMany';
              size = pvcResource?.spec?.resources?.requests?.storage || '10Gi';
              storageClassName = pvcResource?.spec?.storageClassName;
              volumeMode = pvcResource?.spec?.volumeMode || 'Block';
              volumeName = pvcResource?.metadata?.name || '';
            }

            hotpluggable = volume.persistentVolumeClaim.hotpluggable || false;
          }

          const bus = DISK?.disk?.bus || DISK?.cdrom?.bus;

          const bootOrder = DISK?.bootOrder ? DISK?.bootOrder : index;

          const parseValue = parseSi(size);

          const formatSize = formatSi(parseValue, {
            increment:   1024,
            addSuffix:   false,
            maxExponent: 3,
            minExponent: 3,
          });

          const pvc = this.pvcs.find(P => P.id === `${ this.value.metadata.namespace }/${ volumeName }`);

          const volumeStatus = pvc?.relatedPV?.metadata?.annotations?.[HCI_ANNOTATIONS.VOLUME_ERROR];

          const isEncrypted = pvc?.isEncrypted || false;
          const volumeBackups = volBackups?.find(vBackup => vBackup.volumeName === DISK.name) || null;

          return {
            id:         randomStr(5),
            bootOrder,
            source,
            name:       DISK.name,
            realName,
            bus,
            volumeName,
            container,
            accessMode,
            size:       `${ formatSize }Gi`,
            volumeMode: volumeMode || this.customVolumeMode,
            image,
            type,
            storageClassName,
            hotpluggable,
            volumeStatus,
            dataSource,
            namespace,
            isEncrypted,
            volumeBackups,
          };
        });
      }

      out = sortBy(out, 'bootOrder');

      return out.filter( O => O.name !== 'cloudinitdisk');
    },

    getNetworkRows(vm, config) {
      const { fromTemplate = false, init = false } = config;

      const networks = vm.spec.template.spec.networks || [];
      const interfaces = vm.spec.template.spec.domain.devices.interfaces || [];

      const out = interfaces.map( (I, index) => {
        const network = networks.find( N => I.name === N.name);

        const type = I.sriov ? 'sriov' : I.bridge ? 'bridge' : 'masquerade';

        const isPod = !!network.pod;

        return {
          ...I,
          index,
          type,
          isPod,
          newCreateId: (fromTemplate || init) ? randomStr(10) : false,
          model:       I.model,
          networkName: isPod ? MANAGEMENT_NETWORK : network?.multus?.networkName,
        };
      });

      return out;
    },

    parseVM() {
      this.userData = this.getUserData({ osType: this.osType, installAgent: this.installAgent });
      this.parseOther();
      this.parseAccessCredentials();
      this.parseNetworkRows(this.networkRows);
      this.parseDiskRows(this.diskRows);
    },

    parseOther() {
      if (!this.spec.template.spec.domain.machine) {
        this.$set(this.spec.template.spec.domain, 'machine', { type: this.machineType });
      } else {
        this.$set(this.spec.template.spec.domain.machine, 'type', this.machineType);
      }

      this.spec.template.spec.domain.cpu.cores = this.cpu;
      this.spec.template.spec.domain.resources.limits.cpu = this.cpu ? this.cpu.toString() : this.cpu;
      this.spec.template.spec.domain.resources.limits.memory = this.memory;
      this.spec.template.spec.terminationGracePeriodSeconds = this.terminationGracePeriodSeconds;

      // parse reserved memory
      const vm = this.resource === HCI.VM ? this.value : this.value.spec.vm;

      if (!this.reservedMemory) {
        delete vm.metadata.annotations[HCI_ANNOTATIONS.VM_RESERVED_MEMORY];
      } else {
        vm.metadata.annotations[HCI_ANNOTATIONS.VM_RESERVED_MEMORY] = this.reservedMemory;
      }

      if (this.maintenanceStrategy === 'Migrate') {
        delete vm.metadata.labels[HCI_ANNOTATIONS.VM_MAINTENANCE_MODE_STRATEGY];
      } else {
        vm.metadata.labels[HCI_ANNOTATIONS.VM_MAINTENANCE_MODE_STRATEGY] = this.maintenanceStrategy;
      }
    },

    parseDiskRows(disk) {
      const disks = [];
      const volumes = [];
      const diskNameLables = [];
      const volumeClaimTemplates = [];

      disk.forEach( (R, index) => {
        const prefixName = this.value.metadata?.name || '';

        let dataVolumeName = '';

        if (R.source === SOURCE_TYPE.ATTACH_VOLUME) {
          dataVolumeName = R.volumeName;
        } else if (this.isClone || !this.hasCreateVolumes.includes(R.realName)) {
          dataVolumeName = `${ prefixName }-${ R.name }-${ randomStr(5).toLowerCase() }`;
        } else {
          dataVolumeName = R.realName;
        }

        const _disk = this.parseDisk(R, index);
        const _volume = this.parseVolume(R, dataVolumeName);
        const _dataVolumeTemplate = this.parseVolumeClaimTemplate(R, dataVolumeName);

        disks.push(_disk);
        volumes.push(_volume);
        diskNameLables.push(dataVolumeName);

        if (R.source !== SOURCE_TYPE.CONTAINER) {
          volumeClaimTemplates.push(_dataVolumeTemplate);
        }
      });

      if (!this.secretName || this.needNewSecret) {
        this.secretName = this.generateSecretName(this.secretNamePrefix);
      }

      if (!disks.find( D => D.name === 'cloudinitdisk') && (this.userData || this.networkData)) {
        if (!this.isWindows) {
          disks.push({
            name: 'cloudinitdisk',
            disk: { bus: 'virtio' }
          });

          const userData = this.getUserData({ osType: this.osType, installAgent: this.installAgent });

          const cloudinitdisk = {
            name:             'cloudinitdisk',
            cloudInitNoCloud: {}
          };

          if (this.saveUserDataAsClearText) {
            cloudinitdisk.cloudInitNoCloud.userData = userData;
          } else {
            cloudinitdisk.cloudInitNoCloud.secretRef = { name: this.secretName };
          }

          if (this.saveNetworkDataAsClearText) {
            cloudinitdisk.cloudInitNoCloud.networkData = this.networkScript;
          } else {
            cloudinitdisk.cloudInitNoCloud.networkDataSecretRef = { name: this.secretName };
          }

          volumes.push(cloudinitdisk);
        }
      }

      let spec = {
        ...this.spec,
        runStrategy: this.runStrategy,
        template:    {
          ...this.spec.template,
          metadata: {
            ...this.spec?.template?.metadata,
            annotations: {
              ...this.spec?.template?.metadata?.annotations,
              [HCI_ANNOTATIONS.SSH_NAMES]: JSON.stringify(this.sshKey)
            },
            labels: {
              ...this.spec?.template?.metadata?.labels,
              [HCI_ANNOTATIONS.VM_NAME]: this.value?.metadata?.name,
            }
          },
          spec: {
            ...this.spec.template?.spec,
            domain: {
              ...this.spec.template?.spec?.domain,
              devices: {
                ...this.spec.template?.spec?.domain?.devices,
                disks,
              },
            },
            volumes,
          }
        }
      };

      if (volumes.length === 0) {
        delete spec.template.spec.volumes;
      }

      if (this.resource === HCI.VM) {
        if (!this.isSingle) {
          spec = this.multiVMScheduler(spec);
        }

        this.$set(this.value.metadata, 'annotations', {
          ...this.value.metadata.annotations,
          [HCI_ANNOTATIONS.VOLUME_CLAIM_TEMPLATE]: JSON.stringify(volumeClaimTemplates),
          [HCI_ANNOTATIONS.NETWORK_IPS]:           JSON.stringify(this.value.networkIps)
        });

        this.$set(this.value.metadata, 'labels', {
          ...this.value.metadata.labels,
          [HCI_ANNOTATIONS.CREATOR]: 'harvester',
          [HCI_ANNOTATIONS.OS]:      this.osType
        });

        this.$set(this.value, 'spec', spec);
        this.$set(this, 'spec', spec);
      } else if (this.resource === HCI.VM_VERSION) {
        this.$set(this.value.spec.vm, 'spec', spec);
        this.$set(this.value.spec.vm.metadata, 'annotations', { ...this.value.spec.vm.metadata.annotations, [HCI_ANNOTATIONS.VOLUME_CLAIM_TEMPLATE]: JSON.stringify(volumeClaimTemplates) });
        this.$set(this.value.spec.vm.metadata, 'labels', {
          ...this.value.spec.vm.metadata.labels,
          [HCI_ANNOTATIONS.OS]: this.osType,
        });
        this.$set(this, 'spec', spec);
      }
    },

    removeTrailingHyphen(str) {
      while (str.endsWith('-')) {
        str = str.slice(0, -1);
      }

      return str;
    },

    multiVMScheduler(spec) {
      const namePrefix = this.removeTrailingHyphen(this.namePrefix);

      spec.template.metadata.labels[HCI_ANNOTATIONS.VM_NAME_PREFIX] = namePrefix;

      const rule = {
        weight:          1,
        podAffinityTerm: {
          topologyKey:   HOSTNAME,
          labelSelector: { matchLabels: { [HCI_ANNOTATIONS.VM_NAME_PREFIX]: namePrefix } }
        }
      };

      return {
        ...spec,
        template: {
          ...spec.template,
          spec: {
            ...spec.template.spec,
            affinity: {
              ...spec.template.spec.affinity,
              podAntiAffinity: {
                ...spec.template.spec?.affinity?.podAntiAffinity,
                preferredDuringSchedulingIgnoredDuringExecution: [
                  ...(spec.template.spec?.affinity?.podAntiAffinity?.preferredDuringSchedulingIgnoredDuringExecution || []),
                  rule
                ]
              }
            }
          }
        }
      };
    },

    parseNetworkRows(networkRow) {
      const networks = [];
      const interfaces = [];

      networkRow.forEach( (R) => {
        const _network = this.parseNetwork(R);
        const _interface = this.parseInterface(R);

        networks.push(_network);
        interfaces.push(_interface);
      });

      const spec = {
        ...this.spec.template.spec,
        domain: {
          ...this.spec.template.spec.domain,
          devices: {
            ...this.spec.template.spec.domain.devices,
            interfaces,
          },
        },
        networks
      };

      this.$set(this.spec.template, 'spec', spec);
    },

    parseAccessCredentials() {
      const out = [];
      const annotations = {};
      const users = JSON.parse(this.spec?.template?.metadata?.annotations?.[HCI_ANNOTATIONS.DYNAMIC_SSHKEYS_USERS] || '[]');

      for (const row of this.accessCredentials) {
        if (this.needNewSecret) {
          row.secretName = this.generateSecretName(this.secretNamePrefix);
        }

        if (row.source === ACCESS_CREDENTIALS.RESET_PWD) {
          users.push(row.username);
          out.push({
            userPassword: {
              source:            { secret: { secretName: row.secretName } },
              propagationMethod: { qemuGuestAgent: { } }
            }
          });
        }

        if (row.source === ACCESS_CREDENTIALS.INJECT_SSH) {
          users.push(...row.users);
          annotations[row.secretName] = row.sshkeys;
          out.push({
            sshPublicKey: {
              source:            { secret: { secretName: row.secretName } },
              propagationMethod: { qemuGuestAgent: { users: row.users } }
            }
          });
        }
      }

      if (out.length === 0 && !!this.spec.template.spec.accessCredentials) {
        delete this.spec.template.spec.accessCredentials;
      } else {
        this.spec.template.spec.accessCredentials = out;
      }

      if (users.length !== 0) {
        this.spec.template.metadata.annotations[HCI_ANNOTATIONS.DYNAMIC_SSHKEYS_USERS] = JSON.stringify(Array.from(new Set(users)));
        this.spec.template.metadata.annotations[HCI_ANNOTATIONS.DYNAMIC_SSHKEYS_NAMES] = JSON.stringify(annotations);
      }
    },

    getMaintenanceStrategyOptionLabel(opt) {
      return this.t(`harvester.virtualMachine.maintenanceStrategy.options.${ opt.label || opt }`);
    },

    getInitUserData(config) {
      const _QGA_JSON = this.getMatchQGA(config.osType);

      const out = jsyaml.dump(_QGA_JSON);

      return `#cloud-config\n${ out }`;
    },

    /**
     * Generate user data yaml which is decide by the "Install guest agent",
     * "OS type", "SSH Keys" and user input.
     * @param config
     */
    getUserData(config) {
      try {
        // https://github.com/eemeli/yaml/issues/136
        let userDataDoc = this.userScript ? YAML.parseDocument(this.userScript) : YAML.parseDocument({});

        const allSSHAuthorizedKeys = this.mergeSSHAuthorizedKeys(this.userScript);

        if (allSSHAuthorizedKeys.length > 0) {
          userDataDoc.setIn(['ssh_authorized_keys'], allSSHAuthorizedKeys);
        } else if (YAML.isCollection(userDataDoc.getIn('ssh_authorized_keys'))) {
          userDataDoc.deleteIn(['ssh_authorized_keys']);
        }

        userDataDoc = config.installAgent ? this.mergeQGA({ userDataDoc, ...config }) : this.deleteQGA({ userDataDoc, ...config });
        const userDataYaml = userDataDoc.toString();

        if (userDataYaml === '{}\n') {
          // When the YAML parsed value is '{}\n', it means that the userData is empty, then undefined is returned.
          return undefined;
        }

        return userDataYaml;
      } catch (e) {
        console.error('Error: Unable to parse yaml document', e); // eslint-disable-line no-console

        return this.userScript;
      }
    },

    updateSSHKey(neu) {
      this.$set(this, 'sshKey', neu);
    },

    updateCpuMemory(cpu, memory) {
      this.$set(this, 'cpu', cpu);
      this.$set(this, 'memory', memory);
    },

    parseDisk(R, index) {
      const out = { name: R.name };

      if (R.type === HARD_DISK) {
        out.disk = { bus: R.bus };
      } else if (R.type === CD_ROM) {
        out.cdrom = { bus: R.bus };
      }

      out.bootOrder = index + 1;

      return out;
    },

    parseVolume(R, dataVolumeName) {
      const out = { name: R.name };

      if (R.source === SOURCE_TYPE.CONTAINER) {
        out.containerDisk = { image: R.container };
      } else if (R.source === SOURCE_TYPE.IMAGE || R.source === SOURCE_TYPE.NEW || R.source === SOURCE_TYPE.ATTACH_VOLUME) {
        out.persistentVolumeClaim = { claimName: dataVolumeName };
        if (R.hotpluggable) {
          out.persistentVolumeClaim.hotpluggable = true;
        }
      }

      return out;
    },

    parseVolumeClaimTemplate(R, dataVolumeName) {
      if (!String(R.size).includes('Gi') && R.size) {
        R.size = `${ R.size }Gi`;
      }

      const out = {
        metadata: { name: dataVolumeName },
        spec:     {
          accessModes: [R.accessMode],
          resources:   { requests: { storage: R.size } },
          volumeMode:  R.volumeMode
        }
      };

      if (R.dataSource) {
        out.spec.dataSource = R.dataSource;
      }

      switch (R.source) {
      case SOURCE_TYPE.ATTACH_VOLUME:
        out.spec.storageClassName = R.storageClassName;
        break;
      case SOURCE_TYPE.NEW:
        out.spec.storageClassName = R.storageClassName;
        break;
      case SOURCE_TYPE.IMAGE: {
        const image = this.images.find( I => R.image === I.id);

        if (image) {
          out.spec.storageClassName = image.storageClassName;
          out.metadata.annotations = { [HCI_ANNOTATIONS.IMAGE_ID]: image.id };
        } else {
          out.metadata.annotations = { [HCI_ANNOTATIONS.IMAGE_ID]: '' };
        }

        break;
      }
      }

      return out;
    },

    getSSHListValue(arr) {
      return arr.map( id => this.getSSHValue(id)).filter( O => O !== undefined);
    },

    parseInterface(R) {
      const _interface = {};
      const type = R.type;

      _interface[type] = {};

      if (R.macAddress) {
        _interface.macAddress = R.macAddress;
      }

      _interface.model = R.model;
      _interface.name = R.name;

      return _interface;
    },

    parseNetwork(R) {
      const out = { name: R.name };

      if (R.isPod) {
        out.pod = {};
      } else {
        out.multus = { networkName: R.networkName };
      }

      return out;
    },

    updateUserData(value) {
      this.userScript = value;
    },

    updateNetworkData(value) {
      this.networkScript = value;
    },

    mergeSSHAuthorizedKeys(yaml) {
      try {
        const sshAuthorizedKeys = YAML.parseDocument(yaml)
          .get('ssh_authorized_keys')
          ?.toJSON() || [];

        const sshList = this.getSSHListValue(this.sshKey);

        return sshAuthorizedKeys.length ? [...new Set([...sshList, ...sshAuthorizedKeys])] : sshList;
      } catch (e) {
        return [];
      }
    },

    /**
     * @param paths A Object path, e.g. 'a.b.c' => ['a', 'b', 'c']. Refer to https://eemeli.org/yaml/#scalar-values
     * @returns
     */
    deleteYamlDocProp(doc, paths) {
      try {
        const item = doc.getIn([])?.items[0];
        const key = item?.key;
        const hasCloudConfigComment = !!key?.commentBefore?.includes('cloud-config');
        const isMatchProp = key.source === paths[paths.length - 1];

        if (key && hasCloudConfigComment && isMatchProp) {
          // Comments are mounted on the next node and we should not delete the node containing cloud-config
        } else {
          doc.deleteIn(paths);
        }
      } catch (e) {}
    },

    mergeQGA(config) {
      const { osType, userDataDoc } = config;
      const _QGA_JSON = this.getMatchQGA(osType);
      const userDataYAML = userDataDoc.toString();
      const userDataJSON = YAML.parse(userDataYAML);
      let packages = userDataJSON?.packages || [];
      let runcmd = userDataJSON?.runcmd || [];

      userDataDoc.setIn(['package_update'], true);

      if (Array.isArray(packages)) {
        if (!packages.includes('qemu-guest-agent')) {
          packages.push('qemu-guest-agent');
        }
      } else {
        packages = QGA_JSON.packages;
      }

      if (Array.isArray(runcmd)) {
        let findIndex = -1;
        const hasSameRuncmd = runcmd.find( S => Array.isArray(S) && S.join('-') === _QGA_JSON.runcmd[0].join('-'));

        const hasSimilarRuncmd = runcmd.find( (S, index) => {
          if (Array.isArray(S) && S.join('-') === this.getSimilarRuncmd(osType).join('-')) {
            findIndex = index;

            return true;
          }

          return false;
        });

        if (hasSimilarRuncmd) {
          runcmd[findIndex] = _QGA_JSON.runcmd[0];
        } else if (!hasSameRuncmd) {
          runcmd.push(_QGA_JSON.runcmd[0]);
        }
      } else {
        runcmd = _QGA_JSON.runcmd;
      }

      if (packages.length > 0) {
        userDataDoc.setIn(['packages'], packages);
      } else {
        userDataDoc.setIn(['packages'], []); // It needs to be set empty first, as it is possible that cloud-init comments are mounted on this node
        this.deleteYamlDocProp(userDataDoc, ['packages']);
        this.deleteYamlDocProp(userDataDoc, ['package_update']);
      }

      if (runcmd.length > 0) {
        userDataDoc.setIn(['runcmd'], runcmd);
      } else {
        this.deleteYamlDocProp(userDataDoc, ['runcmd']);
      }

      return userDataDoc;
    },

    deleteQGA(config) {
      const { osType, userDataDoc, deletePackage = false } = config;

      const userDataTemplateValue = this.$store.getters['harvester/byId'](CONFIG_MAP, this.userDataTemplateId)?.data?.cloudInit || '';

      const userDataYAML = userDataDoc.toString();
      const userDataJSON = YAML.parse(userDataYAML);
      const packages = userDataJSON?.packages || [];
      const runcmd = userDataJSON?.runcmd || [];

      if (Array.isArray(packages) && deletePackage) {
        const templateHasQGAPackage = this.convertToJson(userDataTemplateValue);

        for (let i = 0; i < packages.length; i++) {
          if (packages[i] === 'qemu-guest-agent') {
            if (!(Array.isArray(templateHasQGAPackage?.packages) && templateHasQGAPackage.packages.includes('qemu-guest-agent'))) {
              packages.splice(i, 1);
            }
          }
        }
      }

      if (Array.isArray(runcmd)) {
        const _QGA_JSON = this.getMatchQGA(osType);

        for (let i = 0; i < runcmd.length; i++) {
          if (Array.isArray(runcmd[i]) && runcmd[i].join('-') === _QGA_JSON.runcmd[0].join('-')) {
            runcmd.splice(i, 1);
          }
        }
      }

      if (packages.length > 0) {
        userDataDoc.setIn(['packages'], packages);
      } else {
        userDataDoc.setIn(['packages'], []);
        this.deleteYamlDocProp(userDataDoc, ['packages']);
        this.deleteYamlDocProp(userDataDoc, ['package_update']);
      }

      if (runcmd.length > 0) {
        userDataDoc.setIn(['runcmd'], runcmd);
      } else {
        this.deleteYamlDocProp(userDataDoc, ['runcmd']);
      }

      return userDataDoc;
    },

    generateSecretName(name) {
      return name ? `${ name }-${ randomStr(5).toLowerCase() }` : undefined;
    },

    getOwnerReferencesFromVM(resource) {
      const name = resource.metadata.name;
      const kind = resource.kind;
      const apiVersion = this.resource === HCI.VM ? 'kubevirt.io/v1' : 'harvesterhci.io/v1beta1';
      const uid = resource?.metadata?.uid;

      return [{
        name,
        kind,
        uid,
        apiVersion,
      }];
    },

    async saveSecret(vm) {
      if (!vm?.spec || !this.secretName || this.isWindows) {
        return true;
      }

      let secret = this.getSecret(vm.spec);

      // const userData = this.getUserData({ osType: this.osType, installAgent: this.installAgent });
      if (!secret && this.isEdit && this.secretRef) {
        // When editing the vm, if the userData and networkData are deleted, we also need to clean up the secret values
        secret = this.secretRef;
      }

      if (!secret || this.needNewSecret) {
        secret = await this.$store.dispatch('harvester/create', {
          metadata: {
            name:            this.secretName,
            namespace:       this.value.metadata.namespace,
            labels:          { [HCI_ANNOTATIONS.CLOUD_INIT]: 'harvester' },
            ownerReferences: this.getOwnerReferencesFromVM(vm)
          },
          type: SECRET
        });
      }

      try {
        if (secret) {
          // If none of the data comes from the secret, then no data needs to be saved to the secret
          if (!this.saveUserDataAsClearText || !this.saveNetworkDataAsClearText) {
            secret.setData('userdata', this.userData || '');
            secret.setData('networkdata', this.networkScript || '');
            await secret.save();
          }
        }
      } catch (e) {
        return Promise.reject(e);
      }
    },

    async saveAccessCredentials(vm) {
      if (!vm?.spec) {
        return true;
      }

      // save
      const toSave = [];

      for (const row of this.accessCredentials) {
        let secretRef = row.secretRef;

        if (!secretRef || this.needNewSecret) {
          secretRef = await this.$store.dispatch('harvester/create', {
            metadata: {
              name:            row.secretName,
              namespace:       vm.metadata.namespace,
              labels:          { [HCI_ANNOTATIONS.CLOUD_INIT]: 'harvester' },
              ownerReferences: this.getOwnerReferencesFromVM(vm)
            },
            type: SECRET
          });
        }

        if (row.source === ACCESS_CREDENTIALS.RESET_PWD) {
          secretRef.setData(row.username, row.newPassword);
        }

        if (row.source === ACCESS_CREDENTIALS.INJECT_SSH) {
          for (const secretId of row.sshkeys) {
            const keypair = (this.$store.getters['harvester/all'](HCI.SSH) || []).find(s => s.id === secretId);

            secretRef.setData(`${ keypair.metadata.namespace }-${ keypair.metadata.name }`, keypair.spec.publicKey);
          }
        }

        toSave.push(secretRef);
      }

      try {
        for (const resource of toSave) {
          await resource.save();
        }
      } catch (e) {
        return Promise.reject(e);
      }
    },

    getAccessCredentialsValidation() {
      const errors = [];

      for (let i = 0; i < this.accessCredentials.length; i++) {
        const row = this.accessCredentials[i];
        const source = row.source;

        if (source === ACCESS_CREDENTIALS.RESET_PWD) {
          if (!row.username) {
            const fieldName = this.t('harvester.virtualMachine.input.username');
            const message = this.t('validation.required', { key: fieldName });

            errors.push(message);
          }

          if (!row.newPassword) {
            const fieldName = this.t('harvester.virtualMachine.input.password');
            const message = this.t('validation.required', { key: fieldName });

            errors.push(message);
          }

          if (row.newPassword && row.newPassword.length < 6) {
            const fieldName = this.t('harvester.virtualMachine.input.password');
            const message = this.t('validation.number.min', { key: fieldName, val: '6' });

            errors.push(message);
          }
        } else {
          if (!row.users || row.users.length === 0) {
            const fieldName = this.t('harvester.virtualMachine.input.username');
            const message = this.t('validation.required', { key: fieldName });

            errors.push(message);
          }

          if (!row.sshkeys || row.sshkeys.length === 0) {
            const fieldName = this.t('harvester.virtualMachine.input.sshKeyValue');
            const message = this.t('validation.required', { key: fieldName });

            errors.push(message);
          }
        }

        if (errors.length > 0) {
          break;
        }
      }

      return errors;
    },

    getHasCreatedVolumes(spec) {
      const out = [];

      if (spec.template.spec.volumes) {
        spec.template.spec.volumes.forEach((V) => {
          if (V?.persistentVolumeClaim?.claimName) {
            out.push(V.persistentVolumeClaim.claimName);
          }
        });
      }

      return out;
    },

    handlerUSBTablet(val) {
      const hasExist = this.isInstallUSBTablet(this.spec);
      const inputs = this.spec.template.spec.domain.devices?.inputs || [];

      if (val && !hasExist) {
        if (inputs.length > 0) {
          inputs.push(USB_TABLET[0]);
        } else {
          Object.assign(this.spec.template.spec.domain.devices, {
            inputs: [
              USB_TABLET[0]
            ]
          });
        }
      } else if (!val) {
        const index = inputs.findIndex(O => isEqual(O, USB_TABLET[0]));

        if (hasExist && inputs.length === 1) {
          this.$delete(this.spec.template.spec.domain.devices, 'inputs');
        } else if (hasExist) {
          inputs.splice(index, 1);
          this.$set(this.spec.template.spec.domain.devices, 'inputs', inputs);
        }
      }
    },

    setBootMethod(boot = { efi: false, secureBoot: false }) {
      if (boot.efi && boot.secureBoot) {
        set(this.spec.template.spec.domain, 'features.smm.enabled', true);
        set(this.spec.template.spec.domain, 'firmware.bootloader.efi.secureBoot', true);
      } else if (boot.efi && !boot.secureBoot) {
        // set(this.spec.template.spec.domain, 'features.smm.enabled', false);

        try {
          this.$delete(this.spec.template.spec.domain.features.smm, 'enabled');
          const noKeys = Object.keys(this.spec.template.spec.domain.features.smm).length === 0;

          if (noKeys) {
            this.$delete(this.spec.template.spec.domain.features, 'smm');
          }
        } catch (e) {}
        set(this.spec.template.spec.domain, 'firmware.bootloader.efi.secureBoot', false);
      } else {
        this.$delete(this.spec.template.spec.domain, 'firmware');
        this.$delete(this.spec.template.spec.domain.features, 'smm');
      }
    },

    setCpuPinning(value) {
      if (value) {
        set(this.spec.template.spec.domain.cpu, 'dedicatedCpuPlacement', true);
      } else {
        this.$delete(this.spec.template.spec.domain.cpu, 'dedicatedCpuPlacement');
      }
    },

    setTPM(tpmEnabled) {
      if (tpmEnabled) {
        set(this.spec.template.spec.domain.devices, 'tpm', {});
      } else {
        this.$delete(this.spec.template.spec.domain.devices, 'tpm');
      }
    },

    deleteSSHFromUserData(ssh = []) {
      const sshAuthorizedKeys = this.getSSHFromUserData(this.userScript);

      ssh.map((id) => {
        const index = sshAuthorizedKeys.findIndex(value => value === this.getSSHValue(id));

        if (index >= 0) {
          sshAuthorizedKeys.splice(index, 1);
        }
      });

      const userDataJson = this.convertToJson(this.userScript);

      userDataJson.ssh_authorized_keys = sshAuthorizedKeys;

      if (sshAuthorizedKeys.length === 0) {
        delete userDataJson.ssh_authorized_keys;
      }

      if (isEmpty(userDataJson)) {
        this.$set(this, 'userScript', undefined);
      } else {
        this.$set(this, 'userScript', jsyaml.dump(userDataJson));
      }

      this.refreshYamlEditor();
    },

    refreshYamlEditor() {
      this.$nextTick(() => {
        this.$refs.yamlEditor?.updateValue();
      });
    },

    toggleAdvanced() {
      this.showAdvanced = !this.showAdvanced;
    },

    updateAgent(value) {
      if (!value) {
        this.deletePackage = true;
      }
    },

    updateDataTemplateId(type, id) {
      if (type === 'user') {
        const oldInstallAgent = this.installAgent;

        this.userDataTemplateId = id;
        this.$nextTick(() => {
          if (oldInstallAgent) {
            this.installAgent = oldInstallAgent;
          }
        });
      }
    },

    updateReserved(value = {}) {
      const { memory } = value;

      this.$set(this, 'reservedMemory', memory);
    },

    updateTerminationGracePeriodSeconds(value) {
      this.$set(this, 'terminationGracePeriodSeconds', value);
    },
  },

  watch: {
    diskRows: {
      handler(neu, old) {
        if (Array.isArray(neu)) {
          const imageId = neu[0]?.image;
          const image = this.images.find( I => imageId === I.id);
          const osType = image?.imageOSType;

          const oldImageId = old[0]?.image;

          if (this.isCreate && oldImageId === imageId && imageId) {
            this.osType = osType;
          }
        }
      }
    },

    secretRef: {
      handler(secret) {
        if (secret && this.resource !== HCI.BACKUP) {
          this.secretName = secret?.metadata.name;
        }
      },
      immediate: true,
      deep:      true
    },

    isWindows(val) {
      if (val) {
        this.$set(this, 'sshKey', []);
        this.$set(this, 'userScript', undefined);
        this.$set(this, 'installAgent', false);
      }
    },

    installUSBTablet(val) {
      this.handlerUSBTablet(val);
    },

    efiEnabled(val) {
      this.setBootMethod({ efi: val, secureBoot: this.secureBoot });
    },

    secureBoot(val) {
      this.setBootMethod({ efi: this.efiEnabled, secureBoot: val });
    },

    cpuPinning(value) {
      this.setCpuPinning(value);
    },

    tpmEnabled(val) {
      this.setTPM(val);
    },

    installAgent: {
      /**
       * rules
       * 1. The value in user Data is the first priority
       * 2. After selecting the template, if checkbox is checked, only merge operation will be performed on user data,
       *    if checkbox is unchecked, no value will be deleted in user data
       */
      handler(neu) {
        if (this.deleteAgent) {
          let out = this.getUserData({
            installAgent: neu, osType: this.osType, deletePackage: this.deletePackage
          });

          if (neu) {
            const hasCloudComment = this.hasCloudConfigComment(out);

            if (!hasCloudComment) {
              out = `#cloud-config\n${ out }`;
            }
          }

          this.$set(this, 'userScript', out);
          this.refreshYamlEditor();
        }
        this.deleteAgent = true;
        this.deletePackage = false;
      }
    },

    osType(neu) {
      const out = this.getUserData({ installAgent: this.installAgent, osType: neu });

      this.$set(this, 'userScript', out);
      this.refreshYamlEditor();
    },

    userScript(neu, old) {
      const hasInstallAgent = this.hasInstallAgent(neu, this.osType, this.installAgent);

      if (hasInstallAgent !== this.installAgent) {
        this.deleteAgent = false;
        this.installAgent = hasInstallAgent;
      }
    },

    sshKey(neu, old) {
      const _diff = difference(old, neu);

      if (_diff.length && this.isEdit) {
        this.deleteSSHFromUserData(_diff);
      }
    }
  }
};
