export const FOLDER_ROUTE = '/collection/:parent';
export const DOCUMENT_ROUTE = '/collection/:parent/document/:id';
export const SETTINGS_ROUTE = '/settings';
export const DEBUG_ROUTE = '/debug';

export const GET_FOLDER_ROUTE = (parent: string) =>
  FOLDER_ROUTE.replace(':parent', parent);
export const GET_DOCUMENT_ROUTE = (parent: string, id: string) =>
  DOCUMENT_ROUTE.replace(':parent', parent).replace(':id', id);
