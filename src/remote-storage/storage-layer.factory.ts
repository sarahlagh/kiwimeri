import { InMemDriver } from './storage-drivers/inmem.driver';
import { PCloudDriver } from './storage-drivers/pcloud/pcloud.driver';
import { SimpleStorageLayer } from './storage-layers/simple.layer';

export type DriverNames = 'pcloud' | 'inmem';
export type LayerTypes = 'simple'; // | 'chunks';

export const storageLayerFactory = (
  driverName: DriverNames,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  layerType = 'simple'
) => {
  let fileProvider;
  switch (driverName) {
    case 'inmem':
      fileProvider = new InMemDriver();
      break;
    case 'pcloud':
    default:
      fileProvider = new PCloudDriver();
  }
  return new SimpleStorageLayer(fileProvider);
};
