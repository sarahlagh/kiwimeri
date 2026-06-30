import { InMemDriver } from './inmem.driver';

vi.mock(import('@/domain/synchronization/drivers/driver-factory'), () => ({
  driverFactory: () => new InMemDriver()
}));
