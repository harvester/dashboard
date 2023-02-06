import { imageUrl, fileRequired } from './vm-image';
import { vmNetworks, vmDisks } from './vm';
import { dataVolumeSize } from './vm-datavolumes';
import { backupTarget } from './setting';
import { volumeSize } from './volume';
import { rancherMonitoring, rancherLogging } from './monitoringAndLogging';

export default {
  imageUrl,
  dataVolumeSize,
  vmNetworks,
  vmDisks,
  fileRequired,
  backupTarget,
  volumeSize,
  rancherMonitoring,
  rancherLogging
};
