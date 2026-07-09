export enum StoreTables {
  Logs = 'logs'
}

export enum SpaceTables {
  Collection = 'collection',
  History = 'history',
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

export enum SpaceContentTables {
  CollectionContent = 'collection_content',
  AnnotationContent = 'document_annotation_content',
  HistoryContent = 'history_content',
  DerivedContent = 'derived_content'
}

export enum SpaceMetrics {
  latestCollectionChange = 'latestCollectionChange'
}

export type StoreQueriesId = 'store' | 'space'; // | 'spaceContent';
export enum SID {
  space = 'space',
  spaceContent = 'spaceContent',
  store = 'store'
}
