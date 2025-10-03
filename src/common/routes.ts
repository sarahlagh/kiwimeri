export const SETTINGS_ROUTE = '/settings';
export const DEBUG_ROUTE = '/debug';
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
