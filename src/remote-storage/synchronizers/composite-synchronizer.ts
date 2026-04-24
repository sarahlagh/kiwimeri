import { AnyData, RemoteResult } from '@/db/types/store-types';
import { CloudStorageDriver } from '../storage-drivers/abstract.driver';
import { driverFactory } from '../storage-drivers/driver-factory';
import { CloudStorageSynchronizer } from './abstract-synchronizer';
import { CollectionSynchronizer } from './collection-synchronizer';

// target: have collection synchronizer share remote & driver with stats
export class CompositeSynchronizer extends CloudStorageSynchronizer {
  protected collectionSynchronizer: CollectionSynchronizer;
  protected driver: CloudStorageDriver;

  constructor(protected remote: RemoteResult) {
    super();
    this.driver = driverFactory(remote.type);
    this.collectionSynchronizer = new CollectionSynchronizer(
      remote,
      this.driver
    );
  }

  public configure(conf: AnyData, proxy?: string, useHttp?: boolean) {
    this.driver.configure(conf, proxy, useHttp);
  }

  public async connect(): Promise<{
    config?: AnyData | null;
    connected: boolean;
  }> {
    // TODO how about stats here
    return this.collectionSynchronizer.connect();
  }

  public async push(force = false) {
    return this.collectionSynchronizer.push(force);
  }

  public async pull(force = false) {
    return this.collectionSynchronizer.pull(force);
  }

  public async destroy() {
    return this.driver.close();
  }
}
