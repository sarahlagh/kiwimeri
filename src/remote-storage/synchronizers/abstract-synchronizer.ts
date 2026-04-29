import { AnyData } from '@/db/types/store-types';

export abstract class CloudStorageSynchronizer {
  public abstract configure(
    conf?: AnyData,
    proxy?: string,
    useHttp?: boolean
  ): void;

  public abstract connect(): Promise<{
    connected: boolean;
    config?: AnyData | null;
  }>;

  public async sync(): Promise<{
    didPull: boolean;
    didPush: boolean;
    success: boolean;
  }> {
    const { success: pullSuccess, didPull } = await this.pull();
    if (pullSuccess) {
      const { success, didPush } = await this.push();
      return { success, didPull, didPush };
    }
    return { success: false, didPull, didPush: false };
  }

  public abstract push(
    force?: boolean
  ): Promise<{ didPush: boolean; success: boolean }>;

  public abstract pull(
    force?: boolean
  ): Promise<{ didPull: boolean; success: boolean }>;

  public abstract destroy(): Promise<void>;
}
