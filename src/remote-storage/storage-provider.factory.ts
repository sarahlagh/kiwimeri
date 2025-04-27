import { InMemDriver } from './storage-drivers/inmem.driver';
import { PCloudDriver } from './storage-drivers/pcloud/pcloud.driver';
import { SimpleStorageProvider } from './storage-providers/simple.provider';

export type DriverNames = 'pcloud' | 'inmem';
export type LayerTypes = 'simple'; // | 'chunks';

export const storageProviderFactory = (
  driverName: DriverNames,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  layerType = 'simple'
) => {
  let driver;
  switch (driverName) {
    case 'inmem':
      driver = new InMemDriver();
      break;
    case 'pcloud':
    default:
      driver = new PCloudDriver();
  }
  return new SimpleStorageProvider(driver);
};
