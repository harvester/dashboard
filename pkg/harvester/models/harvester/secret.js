import { clone } from '@shell/utils/object';
import { HCI } from '../../types';
import { PRODUCT_NAME as HARVESTER_PRODUCT } from '../../config/harvester';
import Secret from '@shell/models/secret';
import { NAMESPACE } from '@shell/config/types';

export default class HciSecret extends Secret {
  get _detailLocation() {
    const schema = this.$getters['schemaFor'](this.type);

    const id = this.id?.replace(/.*\//, '');

    return {
      name:   `${ HARVESTER_PRODUCT }-c-cluster-resource${ schema?.attributes?.namespaced ? '-namespace' : '' }-id`,
      params: {
        product:   HARVESTER_PRODUCT,
        cluster:   this.$rootGetters['clusterId'],
        resource:  this.type,
        id,
        namespace: this.metadata.namespace,
      },
    };
  }

  get detailLocation() {
    const detailLocation = clone(this._detailLocation);

    detailLocation.params.resource = HCI.SECRET;

    return detailLocation;
  }

  get doneOverride() {
    const detailLocation = clone(this._detailLocation);

    delete detailLocation.params.namespace;
    delete detailLocation.params.id;
    detailLocation.params.resource = HCI.SECRET;
    detailLocation.name = `${ HARVESTER_PRODUCT }-c-cluster-resource`;

    return detailLocation;
  }

  get doneRoute() {
    return this.doneOverride.name;
  }

  get parentNameOverride() {
    return this.$rootGetters['i18n/t'](`typeLabel."${ HCI.SECRET }"`, { count: 1 })?.trim();
  }

  get parentLocationOverride() {
    return this.doneOverride;
  }

  get isSystem() {
    const inStore = this.$rootGetters['currentProduct'].inStore;

    const systemNs = this.$rootGetters[`${ inStore }/all`](NAMESPACE).filter(ns => ns.isSystem === true).map(ns => ns.metadata.name);

    return systemNs.includes(this.metadata.namespace);
  }

  get details() {
    const out = [
      {
        label:   this.t('secret.type'),
        content: this.typeDisplay
      }
    ];

    if (this.cn) {
      out.push({
        label:   this.t('secret.certificate.cn'),
        content: this.plusMoreNames ? `${ this.cn } ${ this.t('secret.certificate.plusMore', { n: this.plusMoreNames }) }` : this.cn
      });
    }

    if (this.issuer) {
      out.push({
        label:   this.t('secret.certificate.issuer'),
        content: this.issuer
      });
    }

    if (this.notAfter) {
      out.push({
        label:         'Expires',
        formatter:     'Date',
        formatterOpts: { class: this.dateClass },
        content:       this.notAfter
      });
    }

    return out;
  }
}
