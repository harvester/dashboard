import SteveModel from '@shell/plugins/steve/steve-class';
import { PRODUCT_NAME as HARVESTER_PRODUCT } from '../config/harvester';
import { VIEW_IN_API, DEV } from '@shell/store/prefs';

export default class HarvesterResource extends SteveModel {
  get listLocation() {
    const name = this.harvesterResourcesInExplorer ? 'c-cluster-product-resource' : `${ HARVESTER_PRODUCT }-c-cluster-resource`;

    return this.$rootGetters['type-map/optionsFor'](this.type).customRoute || {
      name,
      params: {
        product:  this.$rootGetters['productId'],
        cluster:  this.$rootGetters['clusterId'],
        resource: this.type,
      },
    };
  }

  get parentLocationOverride() {
    return this.listLocation;
  }

  get doneRoute() {
    return this.listLocation.name;
  }

  get doneOverride() {
    return this.listLocation;
  }

  get harvesterResourcesInExplorer() {
    return this.$rootGetters['productId'] !== HARVESTER_PRODUCT;
  }

  get _detailLocation() {
    const schema = this.$getters['schemaFor'](this.type);
    const id = this.id?.replace(/.*\//, '');
    const name = this.harvesterResourcesInExplorer ? `c-cluster-product-resource${ schema?.attributes?.namespaced ? '-namespace' : '' }-id` : `${ HARVESTER_PRODUCT }-c-cluster-resource${ schema?.attributes?.namespaced ? '-namespace' : '' }-id`;

    const out = {
      name,
      params: {
        product:   this.$rootGetters['productId'],
        cluster:   this.$rootGetters['clusterId'],
        resource:  this.type,
        namespace: this.metadata?.namespace,
        id,
      },
    };

    if (this.harvesterResourcesInExplorer) {
      out.query = { as: 'yaml' };
    }

    return out;
  }

  get forceYaml() {
    return this.harvesterResourcesInExplorer;
  }

  get canViewInApi() {
    try {
      return this.hasLink('self') && this.$rootGetters['prefs/get'](VIEW_IN_API);
    } catch {
      return this.hasLink('self') && this.$rootGetters['prefs/get'](DEV);
    }
  }
}
