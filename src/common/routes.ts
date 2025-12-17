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
export const GET_FOLDER_ROUTE = (parent: string) =>
  `${FOLDER_ROUTE}?folder=${parent}`;
export const GET_DOCUMENT_ROUTE = (parent: string, id: string) =>
  `${DOCUMENT_ROUTE}?folder=${parent}&document=${id}`;

export const GET_ITEM_ROUTE = (
  parent: string,
  docId?: string,
  pageId?: string
) =>
  pageId && docId
    ? GET_PAGE_ROUTE(parent, docId, pageId)
    : docId
      ? GET_DOCUMENT_ROUTE(parent, docId)
      : GET_FOLDER_ROUTE(parent);

export const GET_PAGE_ROUTE = (parent: string, docId: string, pageId: string) =>
  `${DOCUMENT_ROUTE}?folder=${parent}&document=${docId}&page=${pageId}`;

export const isCollectionRoute = (pathname: string) => {
  return pathname === FOLDER_ROUTE || pathname === DOCUMENT_ROUTE;
};

export const GET_UNKNOWN_ITEM_ROUTE = (
  itemId: string,
  type?: CollectionItemTypeValues
) => {
  let route, parent, doc;
  if (!type) type = collectionService.getItemType(itemId);
  switch (type) {
    case CollectionItemType.folder:
    case CollectionItemType.notebook:
      route = GET_FOLDER_ROUTE(itemId);
      break;
    case CollectionItemType.page:
      doc = collectionService.getItemParent(itemId);
      parent = collectionService.getItemParent(doc);
      route = GET_PAGE_ROUTE(parent, doc, itemId);
      break;
    case CollectionItemType.document:
      // eslint-disable-next-line no-case-declarations
      parent = collectionService.getItemParent(itemId);
      route = GET_DOCUMENT_ROUTE(parent, itemId);
      break;
  }
  return route;
};
