import { appConfig } from '@/config';
import { SpaceType, StoreType } from '@/core/db/store-schema';
import collectionService from '@/domain/collection/collection.service';
import { callDerivedTablesListeners } from '@/domain/collection/derived-tables-listeners';
import { Store } from 'tinybase/with-schemas';
import { between, getVersionCode } from '../migrations/migration-utils';
import { spaceDocContent } from '../store';

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

    await this.runSpaceMigrations(space, spaceCode, runtimeCode);
  }

  private async runSpaceMigrations(
    space: Store<SpaceType>,
    from: number,
    to: number
  ) {
    if (between(to, 402, 404)) {
      console.log('[space] 1 migration to run: gc orphaned states');
      const func = await import('./002-delete-orphaned-states');
      func.default(
        space as unknown as Store<never>,
        spaceDocContent as unknown as Store<never>
      );
    }

    if (between(to, 404, 405)) {
      console.log('[space] 1 migration to run: backfill plaintext');
      callDerivedTablesListeners();

      space.transaction(() => {
        collectionService.updateOpenedAtRank();
        collectionService.updateUpdatedAtRank();
      });
    }
  }
}

export const postInitMigrationService = new PostInitMigrationService();
