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
    const fileArchive = (this.status?.archives || {})[filename];

    return fileArchive?.ready === true || fileArchive?.reason;
  }

  downloadArchivesStatus(filename) {
    return (this.status?.archives || {})[filename]?.reason;
  }

  get latestArchivesFileName() {
    const archives = this.status?.archives || {};
    const fileNamePrefix = `${ this.metadata.name }-archive-`;
    const fileNames = Object.keys(archives).map((filename) => {
      return filename.replace(fileNamePrefix, '');
    });
    const latestFileName = fileNames.sort((a, b) => {
      const _a = a.replace(/(\d{2})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z');
      const _b = b.replace(/(\d{2})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z');

      return Date.parse(_b) - Date.parse(_a);
    }).map((filename) => {
      return `${ fileNamePrefix }${ filename }`;
    });

    return latestFileName[0];
  }
}
