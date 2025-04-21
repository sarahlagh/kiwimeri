import { BucketStorageLayer } from './storage-layers/bucket.layer';
import { SimpleStorageLayer } from './storage-layers/simple.layer';
import { InMemProvider } from './storage-providers/inmem.provider';
import { PCloudProvider } from './storage-providers/pcloud/pcloud.provider';

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
