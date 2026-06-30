import { CloudStorageDriver } from './abstract.driver';
import { DriverNames } from './model';
import { PCloudDriver } from './pcloud/pcloud.driver';

export const driverFactory = (driverName: DriverNames): CloudStorageDriver => {
  let driver;
  switch (driverName) {
    case 'pcloud':
    default:
      driver = new PCloudDriver();
  }
  return driver;
};
