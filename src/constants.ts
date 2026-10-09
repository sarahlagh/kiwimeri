import { MessageDescriptor, i18n } from '@lingui/core';
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
  caretForwardCircleOutline,
  chatbubbleEllipsesOutline,
  checkmarkDoneCircleOutline,
  checkmarkDoneOutline,
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
  notificationsOutline,
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

export const MAIN_CONTENT_ID = 'main-content';

export const DEFAULT_NOTEBOOK_ID = '0';
export const CONFLICTS_NOTEBOOK_ID = 'conflicts';

export const ROOT_COLLECTION = 'root';

export const META_JSON = 'meta.json';

export const CONFLICT_STR = '[!] ';

export const ANNOT_PREVIEW_SIZE = 80;
export const DOC_PREVIEW_SIZE = 200;

/** @deprecated */
export const DEFAULT_ORDER = 9999;

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
  collapseCard: chevronDownOutline,
  runNow: caretForwardCircleOutline,
  notificationsPage: notificationsOutline,
  checkAction: checkmarkDoneOutline,
  uncheckAction: checkmarkDoneCircleOutline
};

// for where using lingui macros isn't possible
export const GLOBAL_MESSAGES = {
  homeTitle: msg`Home`,
  defaultNotebookName: msg`Default`,
  conflictsNotebookName: msg`Conflicts`,
  newDocTitle: msg`New document`,
  newFolderTitle: msg`New folder`,
  defaultExportSpaceFilename: msg`collection`
} as const;

export function tt(m: MessageDescriptor | keyof typeof GLOBAL_MESSAGES) {
  if (typeof m === 'string') {
    return i18n._(GLOBAL_MESSAGES[m]);
  }
  return i18n._(m);
}
