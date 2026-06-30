import { appConfig } from '@/config';
import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { AnyData } from '@/core/db/types';
import { networkService } from '@/core/infra/network.service';
import { plt } from '@/core/infra/platform';
import { deviceSettings } from '@/domain/device-settings/device-settings.service';
import remotesService from '@/domain/synchronization/remotes.service';
import { Id } from 'tinybase/with-schemas';
import { CloudStorageSynchronizer } from './merging/abstract-synchronizer';
import { CompositeSynchronizer } from './merging/synchronizers/composite-synchronizer';
import { ConnectedRemote } from './replica-state';

const RPS = SpaceTables.ReplicaState;

class ReplicaService {
  private synchronizers: Map<string, CloudStorageSynchronizer> = new Map();

  public async ping(remote: ConnectedRemote, config?: AnyData) {
    let proxy = undefined;
    let useHttp = false;
    if (!config) config = remote.config;
    if (plt.isWeb()) {
      proxy = deviceSettings.getInternalProxy();
      useHttp = appConfig.DEV_USE_HTTP_IF_POSSIBLE;
    }
    if (!this.synchronizers.has(remote.id))
      this.synchronizers.set(remote.id, new CompositeSynchronizer(remote));
    const synchronizer = this.synchronizers.get(remote.id)!;
    synchronizer.configure(config, proxy, useHttp);

    const networkStatus = networkService.getStatus();
    if (networkStatus && !networkStatus.connected) {
      // if no network, don't bother
      return false;
    }

    const newConf = await synchronizer.connect();
    if (newConf.config) {
      remotesService.setRemoteConfig(remote.id, newConf.config);
    }

    space.setCell(RPS, remote.id, 'connected', newConf.connected || false);
    return true;
  }

  public async push(remoteId: Id, force = false) {
    const synchronizer = this.synchronizers.get(remoteId);
    if (!synchronizer) return { success: false };
    return synchronizer.push(force);
  }

  public async pull(remoteId: Id, force = false) {
    const synchronizer = this.synchronizers.get(remoteId);
    if (!synchronizer) return { success: false };
    return synchronizer.pull(force);
  }

  public async sync(remoteId: Id) {
    const synchronizer = this.synchronizers.get(remoteId);
    if (!synchronizer) return { success: false };
    return synchronizer.sync();
  }

  public async destroy(remoteId: Id) {
    if (this.synchronizers.has(remoteId)) {
      await this.synchronizers.get(remoteId)?.destroy();
    }
    this.synchronizers.delete(remoteId);
    space.delRow(RPS, remoteId);
  }

  public async clearAll() {
    this.synchronizers.forEach(sr => {
      sr.destroy();
    });
    this.synchronizers.clear();
  }
}

const replicaService = new ReplicaService();
export default replicaService;
