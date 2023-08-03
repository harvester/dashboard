import { imageUrl, fileRequired } from './vm-image';
import { vmNetworks, vmDisks, validName } from './vm';
import { dataVolumeSize } from './vm-datavolumes';
import { backupTarget, ntpServers } from './setting';
import { volumeSize } from './volume';
import { rancherMonitoring, rancherLogging } from './monitoringAndLogging';
import { ranges } from './network';
import { validateRfc1123Label, validateDnsSubdomainRfc1123 } from './common';

export default {
  imageUrl,
  dataVolumeSize,
  vmNetworks,
  vmDisks,
  validName,
  fileRequired,
  backupTarget,
  ntpServers,
  volumeSize,
  rancherMonitoring,
  rancherLogging,
  ranges,
  validateRfc1123Label,
  validateDnsSubdomainRfc1123
};
