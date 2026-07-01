import {
  CollectionItem,
  CollectionItemType
} from '@/domain/collection/collection';

export interface Notebook extends CollectionItem {
  type: CollectionItemType.notebook;
}
