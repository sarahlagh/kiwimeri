export const SETTINGS_ROUTE = '/settings';
export const DEBUG_ROUTE = '/debug';

export const FOLDER_ROUTE = '/collection';
export const DOCUMENT_ROUTE = '/document';
export const GET_FOLDER_ROUTE = (parent: string) =>
  `${FOLDER_ROUTE}?folder=${parent}`;
export const GET_DOCUMENT_ROUTE = (parent: string, id: string) =>
  `${DOCUMENT_ROUTE}?folder=${parent}&document=${id}`;
