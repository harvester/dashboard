export const HCI_SETTING = {
  ADDITIONAL_CA:             'additional-ca',
  AUTO_DISK_PROVISION_PATHS: 'auto-disk-provision-paths',
  BACKUP_TARGET:             'backup-target',
  CONTAINERD_REGISTRY:       'containerd-registry',
  CONTAINER_MCM_SUPPORT:     'container-and-mcm-support',
  CCM_CSI_VERSION:           'harvester-csi-ccm-versions',
  CLUSTER_REGISTRATION_URL:  'cluster-registration-url',
  LOG_LEVEL:                 'log-level',
  SERVER_VERSION:            'server-version',
  UI_INDEX:                  'ui-index',
  UI_PLUGIN_INDEX:           'ui-plugin-index',
  UPGRADE_CHECKER_ENABLED:   'upgrade-checker-enabled',
  UPGRADE_CHECKER_URL:       'upgrade-checker-url',
  UI_PL:                     'ui-pl',
  UI_SOURCE:                 'ui-source',
  HTTP_PROXY:                'http-proxy',
  OVERCOMMIT_CONFIG:         'overcommit-config',
  DEFAULT_STORAGE_CLASS:     'default-storage-class',
  VIP:                       'vip-pools',
  SUPPORT_BUNDLE_TIMEOUT:    'support-bundle-timeout',
  SUPPORT_BUNDLE_IMAGE:      'support-bundle-image',
  STORAGE_NETWORK:           'storage-network',
  VM_FORCE_RESET_POLICY:     'vm-force-reset-policy',
  SSL_CERTIFICATES:          'ssl-certificates',
  SSL_PARAMETERS:            'ssl-parameters',
  SUPPORT_BUNDLE_NAMESPACES: 'support-bundle-namespaces',
  RELEASE_DOWNLOAD_URL:      'release-download-url',
};

export const HCI_ALLOWED_SETTINGS = {
  [HCI_SETTING.BACKUP_TARGET]: {
    kind: 'json', from: 'import', canReset: true
  },
  [HCI_SETTING.UI_PL]: {
    kind: 'custom', from: 'import', alias: 'branding'
  },
  [HCI_SETTING.CONTAINER_MCM_SUPPORT]: { kind: 'json', from: 'import' },
  [HCI_SETTING.LOG_LEVEL]:             {
    kind:    'enum',
    options: ['info', 'debug', 'trace']
  },
  [HCI_SETTING.SERVER_VERSION]:          { readOnly: true },
  [HCI_SETTING.UPGRADE_CHECKER_ENABLED]: { kind: 'boolean' },
  [HCI_SETTING.UPGRADE_CHECKER_URL]:     { kind: 'url' },
  [HCI_SETTING.HTTP_PROXY]:              { kind: 'json', from: 'import' },
  [HCI_SETTING.ADDITIONAL_CA]:           {
    kind: 'multiline', canReset: true, from: 'import'
  },
  [HCI_SETTING.OVERCOMMIT_CONFIG]:      { kind: 'json', from: 'import' },
  [HCI_SETTING.SUPPORT_BUNDLE_TIMEOUT]: {},
  [HCI_SETTING.SUPPORT_BUNDLE_IMAGE]:   { kind: 'json', from: 'import' },
  [HCI_SETTING.STORAGE_NETWORK]:        { kind: 'custom', from: 'import' },
  [HCI_SETTING.VM_FORCE_RESET_POLICY]:  { kind: 'json', from: 'import' },
  [HCI_SETTING.SSL_CERTIFICATES]:       { kind: 'json', from: 'import' },
  [HCI_SETTING.VIP]:                    {
    kind: 'json', from: 'import', canReset: true
  },
  [HCI_SETTING.SSL_PARAMETERS]: {
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
  [HCI_SETTING.UI_INDEX]: { kind: 'url' },
};

export const HCI_SINGLE_CLUSTER_ALLOWED_SETTING = { [HCI_SETTING.CLUSTER_REGISTRATION_URL]: { kind: 'url' } };
