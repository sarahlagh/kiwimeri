import { InMemDriver } from './inmem.driver';
import { PCloudDriver } from './pcloud/pcloud.driver';

export type DriverNames = 'pcloud' | 'inmem';

export const driverFactory = (driverName: DriverNames) => {
  let driver;
  switch (driverName) {
    case 'inmem':
      driver = new InMemDriver();
      break;
    case 'pcloud':
    default:
      driver = new PCloudDriver();
  }
  return driver;
};
