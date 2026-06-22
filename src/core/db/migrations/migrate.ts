import { appConfig } from '@/config';
import { NoSchemas, Store } from 'tinybase/with-schemas';
import { between, getVersionCode } from './migration-utils';

export type NoSchemaStore = Store<NoSchemas>;

async function migrateSpace(_space: NoSchemaStore, _store: NoSchemaStore) {
  const runtimeVersion = appConfig.KIWIMERI_VERSION;
  const baseRuntimeVersion = runtimeVersion.split('~')[0];
  const runtimeCode = getVersionCode(baseRuntimeVersion);

  if (between(runtimeCode, 400, 501)) {
    console.log('[migration] 1 space migration to run: post-refacto migration');
    const func = await import('./001-refacto-migrations');
    func.default(_space, _store);
  }

  if (between(runtimeCode, 308, 401)) {
    console.log(
      '[migration] 1 space migration to run: versions gc post page removal'
    );
    const func = await import('./000-gc-page-versions');
    func.default(_space);
  }
}

export async function migrate(_space: NoSchemaStore, _store: NoSchemaStore) {
  return migrateSpace(_space, _store);
}
