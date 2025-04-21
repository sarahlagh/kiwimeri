import { InMemProvider } from './inmem.provider';
import { PCloudProvider } from './pcloud/pcloud';
import { BucketStorageLayer } from './storage-layers/bucket.layer';
import { SimpleStorageLayer } from './storage-layers/simple.layer';

export type ProviderTypes = 'pcloud' | 'inmem';
export type LayerTypes = 'simple' | 'bucket';

export const storageLayerFactory = (
  type: ProviderTypes,
  layerType = 'bucket'
) => {
  let fileProvider;
  switch (type) {
    case 'inmem':
      fileProvider = new InMemProvider();
      break;
    case 'pcloud':
    default:
      fileProvider = new PCloudProvider();
  }
  switch (layerType) {
    case 'simple':
      return new SimpleStorageLayer(fileProvider);
    default:
      return new BucketStorageLayer(fileProvider);
  }
};
