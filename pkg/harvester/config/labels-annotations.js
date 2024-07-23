export const HCI = {
  CLOUD_INIT:                     'harvesterhci.io/cloud-init-template',
  CURRENT_IP:                     'rke2.io/internal-ip',
  IMAGE_ID:                       'harvesterhci.io/imageId',
  SSH_NAMES:                      'harvesterhci.io/sshNames',
  NETWORK_IPS:                    'network.harvesterhci.io/ips',
  TEMPLATE_VERSION_CUSTOM_NAME:   'template-version.harvesterhci.io/customName',
  CREATOR:                        'harvesterhci.io/creator',
  OS:                             'harvesterhci.io/os',
  NETWORK_TYPE:                   'network.harvesterhci.io/type',
  VM_NAME:                        'harvesterhci.io/vmName',
  VM_NAME_PREFIX:                 'harvesterhci.io/vmNamePrefix',
  VM_RESERVED_MEMORY:             'harvesterhci.io/reservedMemory',
  MAINTENANCE_STATUS:             'harvesterhci.io/maintain-status',
  HOST_CUSTOM_NAME:               'harvesterhci.io/host-custom-name',
  HOST_CONSOLE_URL:               'harvesterhci.io/host-console-url',
  RESTORE_NAME:                   'restore.harvesterhci.io/name',
  NODE_ROLE_MASTER:               'node-role.kubernetes.io/master',
  NODE_ROLE_CONTROL_PLANE:        'node-role.kubernetes.io/control-plane',
  NODE_ROLE_ETCD:                 'node-role.harvesterhci.io/witness',
  PROMOTE_STATUS:                 'harvesterhci.io/promote-status',
  MIGRATION_STATE:                'harvesterhci.io/migrationState',
  VOLUME_CLAIM_TEMPLATE:          'harvesterhci.io/volumeClaimTemplates',
  IMAGE_NAME:                     'harvesterhci.io/image-name',
  INIT_IP:                        'etcd.rke2.cattle.io/node-address',
  NODE_SCHEDULABLE:               'kubevirt.io/schedulable',
  NETWORK_ROUTE:                  'network.harvesterhci.io/route',
  MATCHED_NODES:                  'network.harvesterhci.io/matched-nodes',
  OS_UPGRADE_IMAGE:               'harvesterhci.io/os-upgrade-image',
  LATEST_UPGRADE:                 'harvesterhci.io/latestUpgrade',
  UPGRADE_STATE:                  'harvesterhci.io/upgradeState',
  REAY_MESSAGE:                   'harvesterhci.io/read-message',
  DYNAMIC_SSHKEYS_NAMES:          'harvesterhci.io/dynamic-ssh-key-names',
  DYNAMIC_SSHKEYS_USERS:          'harvesterhci.io/dynamic-ssh-key-users',
  IMAGE_SUFFIX:                   'harvesterhci.io/image-type',
  OS_TYPE:                        'harvesterhci.io/os-type',
  STORAGE_PROVISIONER:            'harvesterhci.io/storageProvisioner',
  HOST_REQUEST:                   'management.cattle.io/pod-requests',
  STORAGE_CLASS:                  'harvesterhci.io/storageClassName',
  STORAGE_NETWORK:                'storage-network.settings.harvesterhci.io',
  ADDON_EXPERIMENTAL:             'addon.harvesterhci.io/experimental',
  VOLUME_ERROR:                   'longhorn.io/volume-scheduling-error',
  KVM_AMD_CPU:                    'cpu-feature.node.kubevirt.io/svm',
  KVM_INTEL_CPU:                  'cpu-feature.node.kubevirt.io/vmx',
  NODE_MANUFACTURER:              'manufacturer',
  NODE_MODEL:                     'model',
  NODE_SERIAL_NUMBER:             'serialNumber',
  VM_INSUFFICIENT:                'harvesterhci.io/insufficient-resource-quota',
  NODE_NTP_SYNC_STATUS:           'node.harvesterhci.io/ntp-service',
  PARENT_SRIOV:                   'harvesterhci.io/parent-sriov-network-device',
  PARENT_SRIOV_GPU:               'harvesterhci.io/parentSRIOVGPUDevice',
  VM_MAINTENANCE_MODE_STRATEGY:   'harvesterhci.io/maintain-mode-strategy',
  NODE_CPU_MANAGER:               'cpumanager',
  NODE_CPU_MANAGER_UPDATE_STATUS: 'harvesterhci.io/cpu-manager-update-status',
  NODE_CPU_MANAGER_ENABLED:       'cpumanager'
};
