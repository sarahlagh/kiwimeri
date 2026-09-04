import { getNativePersisters } from '../store';

export function triggerNativeSave() {
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

  console.info('start native storage backup...');
  Promise.all([
    nativeStorePersister.save(),
    nativeSpacePersister.save(),
    nativeSpaceDocContentPersister.save(),
    nativeSpaceArchivePersister.save()
  ])
    .then(() => {
      console.info('native storage backup done');
    })
    .catch(e => {
      console.error('caught error saving to native store', e);
    });
}
