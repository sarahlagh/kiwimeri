import { AnyData, RemoteResult } from '@/db/types/store-types';
import { CloudStorageDriver } from '../storage-drivers/abstract.driver';
import { driverFactory } from '../storage-drivers/driver-factory';
import { CloudStorageSynchronizer } from './abstract-synchronizer';
import { CollectionSynchronizer } from './collection-synchronizer';
import { StatsSynchronizer } from './stats-synchronizer';

// target: have collection synchronizer share remote & driver with stats
export class CompositeSynchronizer extends CloudStorageSynchronizer {
  protected collectionSynchronizer: CollectionSynchronizer;
  protected statsSynchronizer: StatsSynchronizer;
  protected driver: CloudStorageDriver;
  protected statsEnabled = true; // TODO configure

  constructor(protected remote: RemoteResult) {
    super();
    this.driver = driverFactory(remote.type);
    this.collectionSynchronizer = new CollectionSynchronizer(
      remote,
      this.driver
    );
    this.statsSynchronizer = new StatsSynchronizer(remote, this.driver);
  }

  public configure(conf: AnyData, proxy?: string, useHttp?: boolean) {
    this.driver.configure(conf, proxy, useHttp);
  }

  public async connect(): Promise<{
    config?: AnyData | null;
    connected: boolean;
  }> {
    if (this.statsEnabled) {
      setTimeout(async () => await this.statsSynchronizer.connect());
    }
    return this.collectionSynchronizer.connect();
  }

  public async sync() {
    if (this.statsEnabled) {
      setTimeout(async () => await this.statsSynchronizer.sync());
    }
    return this.collectionSynchronizer.sync();
  }

  public async push(force = false) {
    if (this.statsEnabled && force) {
      setTimeout(async () => await this.statsSynchronizer.push(force));
    }
    return this.collectionSynchronizer.push(force);
  }

  public async pull(force = false) {
    if (this.statsEnabled && force) {
      setTimeout(async () => await this.statsSynchronizer.pull(force));
    }
    return this.collectionSynchronizer.pull(force);
  }

  public async destroy() {
    return this.driver.close();
  }
}
