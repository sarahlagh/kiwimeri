export enum StoreTables {
  Profiles = 'profiles',
  Logs = 'logs'
}

export enum SpaceTables {
  Collection = 'collection',
  ResumeState = 'collection_resume_state',
  Stats = 'stats',
  Annotations = 'document_annotation',
  UserPreference = 'user_preference',
  DerivedState = 'derived_item_state',
  DerivedPreview = 'derived_preview',
  LocalChanges = 'local_change',
  Remote = 'remote',
  ReplicaState = 'replica_state'
}

export enum SpaceDocContentTables {
  CollectionContent = 'collection_content',
  AnnotationContent = 'document_annotation_content'
}

export enum SpaceArchiveTables {
  History = 'history',
  HistoryContent = 'history_content'
}

export enum SpaceMetrics {
  latestCollectionChange = 'latestCollectionChange'
}

export type StoreQueriesId = 'store' | 'space' | 'spaceArchive';
export enum SID {
  space = 'space',
  spaceArchive = 'spaceArchive',
  spaceDocContent = 'spaceDocContent',
  store = 'store'
}
