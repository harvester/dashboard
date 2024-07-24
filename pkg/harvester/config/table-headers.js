/**
 * Harvester
 */

// image
export const IMAGE_DOWNLOAD_SIZE = {
  name:     'downloadedBytes',
  labelKey: 'tableHeaders.size',
  value:    'downSize',
  sort:     'status.size',
  width:    120
};

export const IMAGE_VIRTUAL_SIZE = {
  name:     'virtualSize',
  labelKey: 'harvester.tableHeaders.virtualSize',
  value:    'virtualSize',
  sort:     'status.virtualSize',
  width:    120
};

export const IMAGE_PROGRESS = {
  name:      'Uploaded',
  labelKey:  'tableHeaders.progress',
  value:     'status.progress',
  sort:      'status.progress',
  formatter: 'ImagePercentageBar',
};

// SSH keys
export const FINGERPRINT = {
  name:     'Fingerprint',
  labelKey: 'tableHeaders.fingerprint',
  value:    'status.fingerPrint',
};

// The column of target volume on snapshot list page
export const SNAPSHOT_TARGET_VOLUME = {
  name:      'TargetVolume',
  labelKey:  'harvester.tableHeaders.snapshotTargetVolume',
  value:     'spec.source.persistentVolumeClaimName',
  sort:      'spec.source.persistentVolumeClaimName',
  formatter: 'SnapshotTargetVolume',
};

// The column of total snapshot quota column on namespace list page
export const NS_SNAPSHOT_QUOTA = {
  name:          'NamespaceSnapshotQuota',
  labelKey:      'harvester.tableHeaders.totalSnapshotQuota',
  value:         'snapshotSizeQuota',
  sort:          'snapshotSizeQuota',
  align:         'center',
  formatter:     'Si',
  formatterOpts: {
    opts: {
      increment: 1024, addSuffix: true, suffix: 'i',
    },
    needParseSi: false
  },
};
