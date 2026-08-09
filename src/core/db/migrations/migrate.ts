import { appConfig } from '@/config';
import { NoSchemas, Store } from 'tinybase/with-schemas';
import { between, getVersionCode } from './migration-utils';

export type NoSchemaStore = Store<NoSchemas>;

async function migrateSpace(
  _store: NoSchemaStore,
  _space: NoSchemaStore,
  _spaceDocContent: NoSchemaStore,
  _spaceArchive: NoSchemaStore
) {
  const runtimeVersion = appConfig.KIWIMERI_VERSION;
  const baseRuntimeVersion = runtimeVersion.split('~')[0];
  const runtimeCode = getVersionCode(baseRuntimeVersion);

  if (between(runtimeCode, 308, 401)) {
    console.log(
      '[migration] 1 space migration to run: versions gc post page removal'
    );
    const func = await import('./000-gc-page-versions');
    func.default(_space);
  }

  if (between(runtimeCode, 400, 501)) {
    console.log('[migration] 1 space migration to run: post-refacto migration');
    const func1 = await import('./001-refacto-migrations');
    func1.default(_store, _space);

    console.log('[migration] 1 space migration to run: split content store');
    const func2 = await import('./002-split-content-store');
    func2.default(_space, _spaceDocContent, _spaceArchive);
  }
}

export async function migrate(
  _store: NoSchemaStore,
  _space: NoSchemaStore,
  _spaceDocContent: NoSchemaStore,
  _spaceArchive: NoSchemaStore
) {
  return migrateSpace(_store, _space, _spaceDocContent, _spaceArchive);
}
