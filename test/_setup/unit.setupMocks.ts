import { InMemDriver } from './inmem.driver';

vi.mock(import('@/domain/remotes/drivers/driver-factory'), () => ({
  driverFactory: () => new InMemDriver()
}));
