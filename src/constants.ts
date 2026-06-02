import { i18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import {
  add,
  alarmOutline,
  albums,
  alertOutline,
  arrowDown,
  arrowRedoOutline,
  arrowUndoOutline,
  arrowUp,
  bugOutline,
  caretBackCircleOutline,
  chatbubbleEllipsesOutline,
  checkmarkOutline,
  chevronCollapseOutline,
  chevronDownOutline,
  chevronExpandOutline,
  chevronUpOutline,
  close,
  cloudDownloadOutline,
  cloudOfflineOutline,
  cloudUploadOutline,
  constructSharp,
  createOutline,
  documentTextOutline,
  ellipse,
  ellipsisVertical,
  exitOutline,
  fileTrayFullOutline,
  fileTrayOutline,
  fileTrayStackedOutline,
  folderOpenOutline,
  folderSharp,
  funnelOutline,
  gitNetworkSharp,
  helpOutline,
  home,
  informationCircleOutline,
  libraryOutline,
  locateOutline,
  moonOutline,
  moonSharp,
  moveOutline,
  optionsOutline,
  pricetagsOutline,
  pushOutline,
  reorderTwoOutline,
  searchOutline,
  sendOutline,
  settingsSharp,
  statsChartOutline,
  swapHorizontalOutline,
  syncCircleOutline,
  syncOutline,
  trashOutline,
  warningOutline
} from 'ionicons/icons';

export const DEFAULT_SPACE_ID = 'default';
export const DEFAULT_NOTEBOOK_ID = '0';
export const CONFLICTS_NOTEBOOK_ID = 'conflicts';

export const ROOT_COLLECTION = 'root';

export const META_JSON = 'meta.json';

export const CONFLICT_STR = '[!] ';

export const PREVIEW_SIZE = 80;

/** @deprecated */
export const DEFAULT_ORDER = 9999;

// messages
export const ROOT_FOLDER_TITLE = msg`Home`;
export const DEFAULT_NOTEBOOK_NAME = msg`Default`;
export const CONFLICTS_NOTEBOOK_NAME = msg`Conflicts`;
export const NEW_DOC_TITLE = msg`New document`;
export const NEW_FOLDER_TITLE = msg`New folder`;

export const DEFAULT_EXPORT_PAGE_FILENAME = msg`page`;
export const DEFAULT_EXPORT_SPACE_FILENAME = msg`collection`;

// icons
export const APPICONS = {
  collectionPage: folderSharp,
  settingsPage: settingsSharp,
  synchronizationPage: gitNetworkSharp,
  devToolsPage: constructSharp,
  themeLight: moonOutline,
  themeDark: moonSharp,
  home: home,
  library: libraryOutline,
  document: documentTextOutline,
  folder: folderSharp,
  notebook: fileTrayStackedOutline,
  annotation: chatbubbleEllipsesOutline,
  itemActions: ellipsisVertical,
  goToCurrentFolder: locateOutline,
  deleteAction: trashOutline,
  moveAction: moveOutline,
  renameAction: createOutline,
  closeAction: close,
  exitAction: exitOutline,
  goIntoAction: folderOpenOutline,
  resetAction: trashOutline,
  groupAction: fileTrayFullOutline,
  ungroupAction: fileTrayOutline,
  addFolder: albums,
  addDocument: add,
  addGeneric: add,
  cloudSync: syncOutline,
  cloudSyncRemote: syncCircleOutline,
  cloudUpload: cloudUploadOutline,
  cloudDownload: cloudDownloadOutline,
  cloudOffline: cloudOfflineOutline,
  ok: checkmarkOutline,
  ko: bugOutline,
  unknown: helpOutline,
  moveUp: arrowUp,
  moveDown: arrowDown,
  warning: warningOutline,
  alert: alertOutline,
  conflictsAlert: alertOutline,
  info: informationCircleOutline,
  stats: statsChartOutline,
  tags: pricetagsOutline,
  export: sendOutline,
  import: pushOutline,
  sortFilter: funnelOutline,
  dragBar: reorderTwoOutline,
  search: searchOutline,
  options: optionsOutline,
  circleOptions: swapHorizontalOutline,
  history: caretBackCircleOutline,
  restore: arrowUndoOutline,
  save: arrowRedoOutline,
  timedWriting: alarmOutline,
  indicator: ellipse,
  expand: chevronExpandOutline,
  collapse: chevronCollapseOutline,
  expandCard: chevronUpOutline,
  collapseCard: chevronDownOutline
};

// for where using lingui macros isn't possible
const I18N = {
  homeTitle: '',
  defaultNotebookName: '',
  conflictsNotebookName: '',
  newDocTitle: '',
  newFolderTitle: '',
  defaultExportPageFilename: '',
  defaultExportSpaceFilename: ''
};
export function initGlobalTrans() {
  I18N.homeTitle = i18n._(ROOT_FOLDER_TITLE);
  I18N.defaultNotebookName = i18n._(DEFAULT_NOTEBOOK_NAME);
  I18N.conflictsNotebookName = i18n._(CONFLICTS_NOTEBOOK_NAME);
  I18N.newDocTitle = i18n._(NEW_DOC_TITLE);
  I18N.newFolderTitle = i18n._(NEW_FOLDER_TITLE);
  I18N.defaultExportPageFilename = i18n._(DEFAULT_EXPORT_PAGE_FILENAME);
  I18N.defaultExportSpaceFilename = i18n._(DEFAULT_EXPORT_SPACE_FILENAME);
}
export const getGlobalTrans = () => ({ ...I18N });
