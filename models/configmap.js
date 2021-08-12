import { clone } from '@/utils/object';

export default {
  keysDisplay() {
    const keys = [
      ...Object.keys(this.data || []),
      ...Object.keys(this.binaryData || [])
    ];

    if ( !keys.length ) {
      return '(none)';
    }

    // if ( keys.length >= 4 ) {
    //   return `${keys[0]}, ${keys[1]}, ${keys[2]} and ${keys.length - 3} more`;
    // }

    return keys.join(', ');
  },

  detailLocation() { // maybe only harvester mode
    const detailLocation = clone(this._detailLocation);

    detailLocation.params.resource = 'cloudTemplate';

    return detailLocation;
  },

  doneOverride() { // maybe only harvester mode
    const detailLocation = clone(this._detailLocation);

    delete detailLocation.params.namespace;
    delete detailLocation.params.id;
    detailLocation.params.resource = 'cloudTemplate';
    detailLocation.name = 'c-cluster-product-resource';

    return detailLocation;
  }
};
