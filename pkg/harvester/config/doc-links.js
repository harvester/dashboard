import { version } from '../package.json';
import semver from 'semver';

const docVersion = `v${ semver.major(version) }.${ semver.minor(version) }`;

export const DOC_LINKS = {
  CONSOLE_URL:             `https://docs.harvesterhci.io/${ docVersion }/host/#remote-console`,
  RANCHER_INTEGRATION_URL: `https://docs.harvesterhci.io/${ docVersion }/rancher/rancher-integration`,
  STORAGE_NETWORK_EXAMPLE: `https://docs.harvesterhci.io/${ docVersion }/advanced/storagenetwork#configuration-example`,
  KSMTUNED_MODE:           `https://docs.harvesterhci.io/${ docVersion }/host/#ksmtuned-mode`,
  UPGRADE_URL:             `https://docs.harvesterhci.io/${ docVersion }/upgrade/index`
};
