import { InMemProvider } from './inmem.provider';
import { PCloudProvider } from './pcloud/pcloud';
import { SimpleStorageLayer } from './storage-layers/simple.layer';

export type ProviderTypes = 'pcloud' | 'inmem';

export const storageLayerFactory = (type: ProviderTypes) => {
  let fileProvider;
  switch (type) {
    case 'inmem':
      fileProvider = new InMemProvider();
      break;
    case 'pcloud':
    default:
      fileProvider = new PCloudProvider();
  }
  return new SimpleStorageLayer(fileProvider);
};
