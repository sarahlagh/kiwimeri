import { getNativePersisters } from '../store';
import { SID } from '../store-constants';

export function triggerNativeSave(storeId?: SID) {
  const {
    nativeStorePersister,
    nativeSpacePersister,
    nativeSpaceDocContentPersister,
    nativeSpaceArchivePersister
  } = getNativePersisters();
  if (
    nativeStorePersister === null ||
    nativeSpacePersister === null ||
    nativeSpaceDocContentPersister === null ||
    nativeSpaceArchivePersister === null
  ) {
    return; // either they're all null or they're all defined
  }

  const log = `[${storeId ? storeId : 'all'}]`;
  console.log(log, 'start native storage backup...');
  const promises: Promise<unknown>[] = [];
  if (!storeId) {
    promises.push(nativeStorePersister.save());
    promises.push(nativeSpacePersister.save());
    promises.push(nativeSpaceDocContentPersister.save());
    promises.push(nativeSpaceArchivePersister.save());
  } else {
    switch (storeId) {
      case SID.store:
        promises.push(nativeStorePersister.save());
        break;
      case SID.space:
        promises.push(nativeSpacePersister.save());
        break;
      case SID.spaceDocContent:
        promises.push(nativeSpaceDocContentPersister.save());
        break;
      case SID.spaceArchive:
        promises.push(nativeSpaceArchivePersister.save());
        break;
    }
  }
  Promise.all(promises)
    .then(() => {
      console.log(log, 'native storage backup done');
    })
    .catch(e => {
      console.error(log, 'caught error saving to native store', e);
    });
}
