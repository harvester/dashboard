import { MANAGEMENT } from '@shell/config/types';
import NormanModel from '@shell/plugins/steve/norman-class';

export default class CRTB extends NormanModel {
  get clusterroletemplatebinding() {
    return this.$rootGetters[`management/byId`](MANAGEMENT.CLUSTER_ROLE_TEMPLATE_BINDING, this.id?.replace(':', '/'));
  }
}
