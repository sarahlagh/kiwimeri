export enum StoreTables {
  LocalChanges = 'localChanges',
  Remotes = 'remotes',
  RemoteStates = 'remoteState',
  Logs = 'logs',
  Search = 'search',
  Ancestors = 'ancestors'
}

export enum SpaceTables {
  Collection = 'collection',
  History = 'history',
  HistoryContent = 'history_content',
  ResumeState = 'collection_resume_state',
  Stats = 'stats',
  Annotations = 'document_annotation',
  UserPreference = 'user_preference',
  DerivedContent = 'derived_content'
}

export type StoreId = 'store' | 'space';
export enum SID {
  space = 'space',
  store = 'store'
}
