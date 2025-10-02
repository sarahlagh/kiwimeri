import { InMemDriver } from './storage-drivers/inmem.driver';
import { PCloudDriver } from './storage-drivers/pcloud/pcloud.driver';
import { SingleFileStorage } from './storage-filesystems/singlefile.filesystem';

export type DriverNames = 'pcloud' | 'inmem';
export type LayerTypes = 'singlefile'; // | 'chunks';

export const storageFilesystemFactory = (
  driverName: DriverNames,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  layerType = 'singlefile'
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
  return new SingleFileStorage(driver);
};
