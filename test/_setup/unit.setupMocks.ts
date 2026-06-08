import { InMemDriver } from './inmem.driver';

vi.mock(import('@/remote-storage/storage-drivers/driver-factory'), () => ({
  driverFactory: () => new InMemDriver()
}));
