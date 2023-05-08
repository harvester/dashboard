import { imageUrl, fileRequired } from './vm-image';
import { vmNetworks, vmDisks } from './vm';
import { dataVolumeSize } from './vm-datavolumes';
import { backupTarget, ntpServers } from './setting';
import { volumeSize } from './volume';
import { rancherMonitoring, rancherLogging } from './monitoringAndLogging';
import { ranges } from './network';

export default {
  imageUrl,
  dataVolumeSize,
  vmNetworks,
  vmDisks,
  fileRequired,
  backupTarget,
  ntpServers,
  volumeSize,
  rancherMonitoring,
  rancherLogging,
  ranges,
};
