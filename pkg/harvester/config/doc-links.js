import { version } from '../package.json';
import semver from 'semver';

const docVersion = `v${ semver.major(version) }.${ semver.minor(version) }`;

export const DOC_LINKS = { CONSOLE_URL: `https://docs.harvesterhci.io/${ docVersion }/host/` };
