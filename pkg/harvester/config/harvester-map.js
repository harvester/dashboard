export const MemoryUnit = [{
  label: 'Mi',
  value: 'Mi'
}, {
  label: 'Gi',
  value: 'Gi'
},
{
  label: 'TiB',
  value: 'Ti'
}];

export const InterfaceOption = [{
  label: 'VirtIO',
  value: 'virtio'
}, {
  label: 'SATA',
  value: 'sata'
}, {
  label: 'SCSI',
  value: 'scsi'
}];

export const SOURCE_TYPE = {
  NEW:           'New',
  IMAGE:         'Virtual Machine Image',
  ATTACH_VOLUME: 'Existing Volume',
  CONTAINER:     'Container'
};

export const VOLUME_TYPE = [{
  label: 'disk',
  value: 'disk'
}, {
  label: 'cd-rom',
  value: 'cd-rom'
}];

export const ACCESS_CREDENTIALS = {
  RESET_PWD:  'userPassword',
  INJECT_SSH: 'sshPublicKey'
};

export const runStrategies = ['Always', 'RerunOnFailure', 'Manual', 'Halted'];

export const maintenanceStrategies = [
  'Migrate',
  'ShutdownAndRestartAfterEnable',
  'ShutdownAndRestartAfterDisable',
  'Shutdown'
];

export const VOLUME_DATA_SOURCE_KIND = {
  VolumeSnapshot:        'VolumeSnapshot',
  PersistentVolumeClaim: 'Volume'
};

export const FLOW_TYPE = {
  LOGGING: 'Logging',
  AUDIT:   'Audit',
  EVENT:   'Event'
};

export const ADD_ONS = {
  HARVESTER_SEEDER:                 'harvester-seeder',
  PCI_DEVICE_CONTROLLER:            'pcidevices-controller',
  NVIDIA_DRIVER_TOOLKIT_CONTROLLER: 'nvidia-driver-toolkit',
  RANCHER_LOGGING:                  'rancher-logging',
  RANCHER_MONITORING:               'rancher-monitoring',
  VM_IMPORT_CONTROLLER:             'vm-import-controller',
};
