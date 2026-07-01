import {
  CollectionItemType,
  CollectionItemTypeValues
} from '@/domain/collection/collection';
import collectionService from '@/domain/collection/collection.service';

export const INIT_ROUTE = '/';

export const SETTINGS_ROUTE = '/settings';
export const SYNCHRONIZATION_ROUTE = '/synchronization';
export const DEV_TOOLS_ROUTE = '/devtools';

export const FOLDER_ROUTE = '/collection';
export const DOCUMENT_ROUTE = '/document';
export const VERSION_ROUTE = '/version';

export const WRITING_SESSION_ROUTE = '/write';

// TODO use URLSearchParams

export const GET_FOLDER_ROUTE = (parent: string, query?: string | null) =>
  `${FOLDER_ROUTE}?folder=${parent}${query ? '&query=' + query : ''}`;
export const GET_DOCUMENT_ROUTE = (
  parent: string,
  id: string,
  query?: string | null
) =>
  `${DOCUMENT_ROUTE}?folder=${parent}&document=${id}${query ? '&query=' + query : ''}`;

export const GET_ITEM_ROUTE = (
  parent: string,
  docId?: string,
  query?: string | null
) =>
  docId
    ? GET_DOCUMENT_ROUTE(parent, docId, query)
    : GET_FOLDER_ROUTE(parent, query);

export const isCollectionRoute = (pathname: string) => {
  return pathname === FOLDER_ROUTE || pathname === DOCUMENT_ROUTE;
};

export const GET_UNKNOWN_ITEM_ROUTE = (
  itemId: string,
  type: CollectionItemTypeValues,
  query?: string | null
) => {
  let route, parent;
  switch (type) {
    case CollectionItemType.folder:
    case CollectionItemType.notebook:
    default:
      route = GET_FOLDER_ROUTE(itemId, query);
      break;
    case CollectionItemType.document:
      // eslint-disable-next-line no-case-declarations
      parent = collectionService.getItemParent(itemId);
      route = GET_DOCUMENT_ROUTE(parent, itemId, query);
      break;
  }
  return route;
};

export const GET_VERSIONED_ROUTE = (
  docVersion: string,
  docId: string,
  folder: string,
  query?: string | null
) =>
  `${VERSION_ROUTE}?docVersion=${docVersion}&folder=${folder}&document=${docId}${query ? '&query=' + query : ''}`;
