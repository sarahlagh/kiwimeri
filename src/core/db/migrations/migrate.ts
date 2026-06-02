import { appConfig } from '@/config';
import { NoSchemas, Store } from 'tinybase/with-schemas';
import { StoreId } from '../store-schema';
import { between, getVersionCode } from './migration-utils';

async function migrateSpace(_store: Store<NoSchemas>) {
  const runtimeVersion = appConfig.KIWIMERI_VERSION;
  const baseRuntimeVersion = runtimeVersion.split('~')[0];
  const runtimeCode = getVersionCode(baseRuntimeVersion);

  if (between(runtimeCode, 308, 401)) {
    console.log(
      '[migration] 1 space migration to run: versions gc post page removal'
    );
    const func = await import('./000-gc-page-versions');
    func.default(_store);
  }
}

export async function migrate(store: Store<NoSchemas>, storeId: StoreId) {
  if (storeId === 'space') {
    return migrateSpace(store);
  }
}
