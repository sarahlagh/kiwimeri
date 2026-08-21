export enum StoreTables {
  Profiles = 'profiles',
  Logs = 'logs',
  Tasks = 'tasks'
}

export enum SpaceTables {
  Collection = 'collection',
  ResumeState = 'collection_resume_state',
  Stats = 'stats',
  Annotations = 'document_annotation',
  UserPreference = 'user_preference',
  ProjectedState = 'collection_projected_state',
  CollectionItemView = 'collection_item_view',
  AnnotationView = 'document_annotation_view',
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
