import { CloudStorageDriver } from './abstract.driver';
import { PCloudDriver } from './pcloud/pcloud.driver';
import { DriverNames } from './types';

export const driverFactory = (driverName: DriverNames): CloudStorageDriver => {
  let driver;
  switch (driverName) {
    case 'pcloud':
    default:
      driver = new PCloudDriver();
  }
  return driver;
};
