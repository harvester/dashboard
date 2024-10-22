export const HCI_SETTING = {
  BACKUP_TARGET:                          'backup-target',
  CONTAINERD_REGISTRY:                    'containerd-registry',
  LOG_LEVEL:                              'log-level',
  SERVER_VERSION:                         'server-version',
  UI_INDEX:                               'ui-index',
  UI_PLUGIN_INDEX:                        'ui-plugin-index',
  UPGRADE_CHECKER_ENABLED:                'upgrade-checker-enabled',
  UPGRADE_CHECKER_URL:                    'upgrade-checker-url',
  VLAN:                                   'vlan',
  UI_SOURCE:                              'ui-source',
  UI_PL:                                  'ui-pl',
  HTTP_PROXY:                             'http-proxy',
  ADDITIONAL_CA:                          'additional-ca',
  OVERCOMMIT_CONFIG:                      'overcommit-config',
  CLUSTER_REGISTRATION_URL:               'cluster-registration-url',
  DEFAULT_STORAGE_CLASS:                  'default-storage-class',
  SUPPORT_BUNDLE_TIMEOUT:                 'support-bundle-timeout',
  SUPPORT_BUNDLE_EXPIRATION:              'support-bundle-expiration',
  SUPPORT_BUNDLE_IMAGE:                   'support-bundle-image',
  SUPPORT_BUNDLE_NODE_COLLECTION_TIMEOUT: 'support-bundle-node-collection-timeout',
  STORAGE_NETWORK:                        'storage-network',
  VM_FORCE_RESET_POLICY:                  'vm-force-reset-policy',
  SSL_CERTIFICATES:                       'ssl-certificates',
  SSL_PARAMETERS:                         'ssl-parameters',
  SUPPORT_BUNDLE_NAMESPACES:              'support-bundle-namespaces',
  AUTO_DISK_PROVISION_PATHS:              'auto-disk-provision-paths',
  RELEASE_DOWNLOAD_URL:                   'release-download-url',
  CCM_CSI_VERSION:                        'harvester-csi-ccm-versions',
  CSI_DRIVER_CONFIG:                      'csi-driver-config',
  VM_TERMINATION_PERIOD:                  'default-vm-termination-grace-period-seconds',
  NTP_SERVERS:                            'ntp-servers',
  AUTO_ROTATE_RKE2_CERTS:                 'auto-rotate-rke2-certs',
  KUBECONFIG_DEFAULT_TOKEN_TTL_MINUTES:   'kubeconfig-default-token-ttl-minutes',
  LONGHORN_V2_DATA_ENGINE_ENABLED:        'longhorn-v2-data-engine-enabled',
  ADDITIONAL_GUEST_MEMORY_OVERHEAD_RATIO: 'additional-guest-memory-overhead-ratio'
};

export const HCI_ALLOWED_SETTINGS = {
  [HCI_SETTING.BACKUP_TARGET]: {
    kind: 'json', from: 'import', canReset: true
  },
  [HCI_SETTING.LOG_LEVEL]: {
    kind:    'enum',
    options: ['info', 'debug', 'trace']
  },
  [HCI_SETTING.VLAN]: {
    kind: 'custom', from: 'import', alias: 'vlan'
  },
  [HCI_SETTING.AUTO_ROTATE_RKE2_CERTS]:  { kind: 'json', from: 'import' },
  [HCI_SETTING.CSI_DRIVER_CONFIG]:       { kind: 'json', from: 'import' },
  [HCI_SETTING.SERVER_VERSION]:          { readOnly: true },
  [HCI_SETTING.UPGRADE_CHECKER_ENABLED]: { kind: 'boolean' },
  [HCI_SETTING.UPGRADE_CHECKER_URL]:     { kind: 'url' },
  [HCI_SETTING.HTTP_PROXY]:              { kind: 'json', from: 'import' },
  [HCI_SETTING.ADDITIONAL_CA]:           {
    kind: 'multiline', canReset: true, from: 'import'
  },
  [HCI_SETTING.OVERCOMMIT_CONFIG]:                      { kind: 'json', from: 'import' },
  [HCI_SETTING.SUPPORT_BUNDLE_TIMEOUT]:                 {},
  [HCI_SETTING.SUPPORT_BUNDLE_EXPIRATION]:              {},
  [HCI_SETTING.SUPPORT_BUNDLE_NODE_COLLECTION_TIMEOUT]: {},
  [HCI_SETTING.SUPPORT_BUNDLE_IMAGE]:                   { kind: 'json', from: 'import' },
  [HCI_SETTING.STORAGE_NETWORK]:                        { kind: 'custom', from: 'import' },
  [HCI_SETTING.VM_FORCE_RESET_POLICY]:                  { kind: 'json', from: 'import' },
  [HCI_SETTING.RANCHER_MANAGER_SUPPORT]:                { kind: 'boolean' },
  [HCI_SETTING.SSL_CERTIFICATES]:                       { kind: 'json', from: 'import' },
  [HCI_SETTING.SSL_PARAMETERS]:                         {
    kind: 'json', from: 'import', canReset: true
  },
  [HCI_SETTING.SUPPORT_BUNDLE_NAMESPACES]: { from: 'import', canReset: true },
  [HCI_SETTING.AUTO_DISK_PROVISION_PATHS]: { canReset: true },
  [HCI_SETTING.RELEASE_DOWNLOAD_URL]:      { kind: 'url' },
  [HCI_SETTING.UI_PLUGIN_INDEX]:           { kind: 'url' },
  [HCI_SETTING.CONTAINERD_REGISTRY]:       {
    kind: 'json', from: 'import', canReset: true
  },
  [HCI_SETTING.UI_SOURCE]: {
    kind:    'enum',
    options: ['auto', 'external', 'bundled']
  },
  [HCI_SETTING.UI_INDEX]:              { kind: 'url' },
  [HCI_SETTING.VM_TERMINATION_PERIOD]: { kind: 'string', from: 'import' },
  [HCI_SETTING.NTP_SERVERS]:           {
    kind: 'json', from: 'import', canReset: true
  },
  [HCI_SETTING.KUBECONFIG_DEFAULT_TOKEN_TTL_MINUTES]:   {},
  [HCI_SETTING.LONGHORN_V2_DATA_ENGINE_ENABLED]:        { kind: 'boolean', experimental: true },
  [HCI_SETTING.ADDITIONAL_GUEST_MEMORY_OVERHEAD_RATIO]: { kind: 'string', from: 'import' },
};

export const HCI_SINGLE_CLUSTER_ALLOWED_SETTING = {
  [HCI_SETTING.CLUSTER_REGISTRATION_URL]: {
    kind:     'url',
    canReset: true,
  },
  [HCI_SETTING.UI_PL]: {
    kind: 'custom', from: 'import', alias: 'branding'
  }
};
