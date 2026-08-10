import { appConfig } from '@/config';
import { SpaceType, StoreType } from '@/core/db/store-schema';
import { callDerivedTablesListeners } from '@/domain/collection/derived-tables-listeners';
import { Store } from 'tinybase/with-schemas';
import { between, getVersionCode } from '../migrations/migration-utils';
import { spaceDocContent } from '../store';

/** migrations that can be applied after schema */
class PostInitMigrationService {
  private enabled = true;

  public async start(store: Store<StoreType>, _space: Store<SpaceType>) {
    if (!this.enabled) return;
    const runtimeVersion = appConfig.KIWIMERI_VERSION;
    const baseRuntimeVersion = runtimeVersion.split('~')[0];
    const spaceVersion = _space.getValue('appVersion')?.valueOf() || '0.2.6';
    const runtimeCode = getVersionCode(baseRuntimeVersion);
    const spaceCode = getVersionCode(spaceVersion);

    if (baseRuntimeVersion !== spaceVersion) {
      console.warn(
        `version mismatch detected: runtime is ${baseRuntimeVersion} (${runtimeCode}), local space is ${spaceVersion} (${spaceCode})`
      );
      _space.setValue('appVersion', baseRuntimeVersion);
    }

    await this.runSpaceMigrations(_space, spaceCode, runtimeCode);
  }

  private async runSpaceMigrations(
    space: Store<SpaceType>,
    from: number,
    to: number
  ) {
    const _space = space as unknown as Store<never>;
    if (between(to, 402, 404)) {
      console.log('[space] 1 migration to run: gc orphaned states');
      const func = await import('./002-delete-orphaned-states');
      func.default(_space, spaceDocContent as unknown as Store<never>);
    }

    if (between(to, 404, 405)) {
      console.log('[space] 1 migration to run: backfill plaintext');
      callDerivedTablesListeners();
    }
  }
}

export const postInitMigrationService = new PostInitMigrationService();
