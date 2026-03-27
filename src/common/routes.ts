import {
  CollectionItemType,
  CollectionItemTypeValues
} from '@/collection/collection';
import collectionService from '@/db/collection.service';

export const SETTINGS_ROUTE = '/settings';
export const SYNCHRONIZATION_ROUTE = '/synchronization';
export const DEV_TOOLS_ROUTE = '/devtools';

export const FOLDER_ROUTE = '/collection';
export const DOCUMENT_ROUTE = '/document';
export const VERSION_ROUTE = '/version';

export const DANGEROUS_MODE_ROUTE = '/dangerous-mode';

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
  pageId?: string,
  query?: string | null
) =>
  pageId && docId
    ? GET_PAGE_ROUTE(parent, docId, pageId, query)
    : docId
      ? GET_DOCUMENT_ROUTE(parent, docId, query)
      : GET_FOLDER_ROUTE(parent, query);

export const GET_PAGE_ROUTE = (
  parent: string,
  docId: string,
  pageId: string,
  query?: string | null
) =>
  `${DOCUMENT_ROUTE}?folder=${parent}&document=${docId}&page=${pageId}${query ? '&query=' + query : ''}`;

export const isCollectionRoute = (pathname: string) => {
  return pathname === FOLDER_ROUTE || pathname === DOCUMENT_ROUTE;
};

export const GET_UNKNOWN_ITEM_ROUTE = (
  itemId: string,
  type: CollectionItemTypeValues,
  query?: string | null
) => {
  let route, parent, doc;
  switch (type) {
    case CollectionItemType.folder:
    case CollectionItemType.notebook:
    default:
      route = GET_FOLDER_ROUTE(itemId, query);
      break;
    case CollectionItemType.page:
      doc = collectionService.getItemParent(itemId);
      parent = collectionService.getItemParent(doc);
      route = GET_PAGE_ROUTE(parent, doc, itemId, query);
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
  itemType: CollectionItemTypeValues,
  docVersion: string,
  docId: string,
  folder: string,
  pageId?: string,
  pageVersion?: string,
  query?: string | null
) => {
  let route;
  switch (itemType) {
    case CollectionItemType.page:
      route = `${VERSION_ROUTE}?docVersion=${docVersion}&pageVersion=${pageVersion}&folder=${folder}&document=${docId}&page=${pageId}${query ? '&query=' + query : ''}`;
      break;
    case CollectionItemType.document:
    default:
      route = `${VERSION_ROUTE}?docVersion=${docVersion}&folder=${folder}&document=${docId}${query ? '&query=' + query : ''}`;
      break;
  }
  return route;
};
