import { get } from '@shell/utils/object';
import { HCI } from '../types';
import Parse from 'url-parse';
import { findBy } from '@shell/utils/array';
import HarvesterResource from './harvester';

export default class HciUpgradeLog extends HarvesterResource {
  get canStartedDownload() {
    const conditions = get(this, 'status.conditions');
    const status = (findBy(conditions, 'type', 'DownloadReady') || {}).status ;

    return status === 'True';
  }

  downloadLog(filename) {
    const parse = Parse(window.history.href);
    const clusterId = this.$rootGetters['clusterId'];
    const prefix = `/k8s/clusters/${ clusterId }`;

    if (this.$rootGetters['isMultiCluster']) {
      window.location.href = `${ parse.origin }${ prefix }/v1/harvester/${ HCI.UPGRADE_LOG }s/${ this.id }/download?archiveName=${ filename }`;
    } else {
      window.location.href = `${ parse.origin }/v1/harvester/${ HCI.UPGRADE_LOG }s/${ this.id }/download?archiveName=${ filename }`;
    }
  }

  fileIsReady(filename) {
    return (this.status?.archives || {})[filename]?.ready === true;
  }
}
