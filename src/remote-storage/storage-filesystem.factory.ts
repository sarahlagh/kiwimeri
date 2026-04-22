import { driverFactory, DriverNames } from './storage-drivers/driver-factory';
import { SingleFileStorage } from './storage-filesystems.v1/singlefile.filesystem';

export type LayerTypes = 'singlefile'; // | 'chunks';

export const storageFilesystemV1Factory = (
  driverName: DriverNames,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  layerType = 'singlefile'
) => {
  return new SingleFileStorage(driverFactory(driverName));
};
