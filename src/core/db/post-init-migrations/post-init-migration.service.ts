import { appConfig } from '@/config';
import { SpaceType, StoreType } from '@/core/db/store-schema';
import { Store } from 'tinybase/with-schemas';
import { between, getVersionCode } from '../migrations/migration-utils';

/** migrations that can be applied after schema */
class PostInitMigrationService {
  private enabled = true;

  public async start(store: Store<StoreType>, space: Store<SpaceType>) {
    if (!this.enabled) return;
    const runtimeVersion = appConfig.KIWIMERI_VERSION;
    const baseRuntimeVersion = runtimeVersion.split('~')[0];
    const spaceVersion = space.getValue('appVersion')?.valueOf() || '0.2.6';
    const runtimeCode = getVersionCode(baseRuntimeVersion);
    const spaceCode = getVersionCode(spaceVersion);

    if (baseRuntimeVersion !== spaceVersion) {
      console.warn(
        `version mismatch detected: runtime is ${baseRuntimeVersion} (${runtimeCode}), local space is ${spaceVersion} (${spaceCode})`
      );
      space.setValue('appVersion', baseRuntimeVersion);
    }

    await this.runStoreMigrations(store, spaceCode, runtimeCode);
    await this.runSpaceMigrations(space, spaceCode, runtimeCode);
  }

  private async runSpaceMigrations(
    space: Store<SpaceType>,
    from: number,
    to: number
  ) {
    if (from <= 306 && between(to, 306, 307)) {
      console.log('[space] 1 migration to run: itemId backfill');
      const func = await import('./001-add-itemid-column');
      func.default(space);
    }
  }

  private async runStoreMigrations(
    store: Store<StoreType>,
    from: number,
    to: number
  ) {
    if (between(to, 308, 401)) {
      console.log('[store] 1 migration to run: reset search ancestry');
      const func = await import('./xxx-reset-search-ancestry');
      func.default(store);
    }
  }
}

export const postInitMigrationService = new PostInitMigrationService();
