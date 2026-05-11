import platformService from '@/common/services/platform.service';
import { appConfig } from '@/config';
import { Store } from 'tinybase/with-schemas';
import { SpaceType } from '../types/space-types';
import { StoreType } from '../types/store-types';

const versionRegexp = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;

function between(to: number, l: number, g: number) {
  return to >= l && to <= g;
}

class MigrationService {
  private enabled = true;

  public async start(store: Store<StoreType>, space: Store<SpaceType>) {
    if (!this.enabled) return;
    const runtimeVersion = appConfig.KIWIMERI_VERSION;
    const baseRuntimeVersion = runtimeVersion.split('~')[0];
    const storeVersion = store.getValue('appVersion')?.valueOf() || '0.2.6';
    const spaceVersion = space.getValue('schemaVersion')?.valueOf() || '0.2.6';
    const runtimeCode = this.getVersionCode(baseRuntimeVersion);
    const storeCode = this.getVersionCode(storeVersion);
    const spaceCode = this.getVersionCode(spaceVersion);

    if (baseRuntimeVersion !== storeVersion) {
      console.warn(
        `version mismatch detected: runtime is ${baseRuntimeVersion} (${runtimeCode}), local store is ${storeVersion} (${storeCode})`
      );
      store.setValue('appVersion', baseRuntimeVersion);
    }

    if (baseRuntimeVersion !== spaceVersion) {
      console.warn(
        `version mismatch detected: runtime is ${baseRuntimeVersion} (${runtimeCode}), local space is ${spaceVersion} (${spaceCode})`
      );
      await this.runSpaceMigrations(space, spaceCode, runtimeCode);
      space.setValue('schemaVersion', baseRuntimeVersion);
    } else if (!platformService.isRelease()) {
      await this.runSpaceMigrations(space, spaceCode, runtimeCode);
    }
  }

  private async runSpaceMigrations(
    space: Store<SpaceType>,
    from: number,
    to: number
  ) {
    if (from <= 206 && to >= 207) {
      console.log('[space] 1 migration to run: history backfill');
      const func = await import('./000-create-document-versions');
      func.default(space);
    }

    if (from <= 306 && between(to, 306, 307)) {
      console.log('[space] 1 migration to run: itemId backfill');
      const func = await import('./001-add-itemid-column');
      func.default(space);
    }

    if (from <= 308 && between(to, 308, 401)) {
      console.log('[space] 1 migration to run: versions gc post page removal');
      const func = await import('./002-gc-page-versions');
      func.default(space);
    }
  }

  private getVersionCode(version: string): number {
    const versionMatch = version.match(versionRegexp);
    if (!versionMatch) {
      return -1;
    }
    const major = parseInt(versionMatch[1]);
    const minor = parseInt(versionMatch[2]);
    const fix = parseInt(versionMatch[3]);
    return fix + minor * 100 + major * 10000;
  }
}

export const migrationService = new MigrationService();
