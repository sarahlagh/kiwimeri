export enum StoreTables {
  Remotes = 'remotes',
  RemoteStates = 'remoteState',
  Logs = 'logs'
}

export enum SpaceTables {
  Collection = 'collection',
  History = 'history',
  HistoryContent = 'history_content',
  ResumeState = 'collection_resume_state',
  Stats = 'stats',
  Annotations = 'document_annotation',
  UserPreference = 'user_preference',
  DerivedContent = 'derived_content',
  DerivedState = 'derived_item_state',
  LocalChanges = 'local_change',
  RemoteConfig = 'remote',
  RemoteState = 'replica_state'
}

export type StoreId = 'store' | 'space';
export enum SID {
  space = 'space',
  store = 'store'
}
