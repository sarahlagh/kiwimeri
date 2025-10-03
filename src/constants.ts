import { msg } from '@lingui/core/macro';
import {
  add,
  albums,
  alertOutline,
  arrowDown,
  arrowUp,
  bugOutline,
  checkmarkOutline,
  close,
  cloudDownloadOutline,
  cloudOfflineOutline,
  cloudUploadOutline,
  constructSharp,
  createOutline,
  documentTextOutline,
  downloadOutline,
  ellipsisVertical,
  exitOutline,
  fileTrayStackedOutline,
  folderOpenOutline,
  folderSharp,
  helpOutline,
  home,
  informationCircleOutline,
  libraryOutline,
  locateOutline,
  moonOutline,
  moonSharp,
  pricetagsOutline,
  receiptOutline,
  sendOutline,
  settingsSharp,
  syncCircleOutline,
  syncOutline,
  trashOutline,
  warningOutline
} from 'ionicons/icons';
import {
  CollectionItemType,
  CollectionItemTypeValues
} from './collection/collection';

export const KIWIMERI_MODEL_VERSION = 0;

export const DEFAULT_SPACE_ID = 'default';
export const DEFAULT_NOTEBOOK_ID = '0';
export const CONFLICTS_NOTEBOOK_ID = 'conflicts';

export const ROOT_COLLECTION = 'root';

export const META_JSON = 'meta.json';

export const INTERNAL_FORMAT = 'raw';

export const CONFLICT_STR = '[!] ';

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
  devToolsPage: constructSharp,
  themeLight: moonOutline,
  themeDark: moonSharp,
  home: home,
  library: libraryOutline,
  document: documentTextOutline,
  folder: folderSharp,
  notebook: fileTrayStackedOutline,
  page: receiptOutline,
  itemActions: ellipsisVertical,
  goToCurrentFolder: locateOutline,
  deleteAction: trashOutline,
  moveAction: exitOutline,
  renameAction: createOutline,
  closeAction: close,
  goIntoAction: folderOpenOutline,
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
  tags: pricetagsOutline,
  export: sendOutline,
  import: downloadOutline
};

export const APPICONS_PER_TYPE = new Map<CollectionItemTypeValues, string>();
APPICONS_PER_TYPE.set(CollectionItemType.document, APPICONS.document);
APPICONS_PER_TYPE.set(CollectionItemType.folder, APPICONS.folder);
APPICONS_PER_TYPE.set(CollectionItemType.notebook, APPICONS.notebook);
APPICONS_PER_TYPE.set(CollectionItemType.page, APPICONS.page);

export const ARIA_DESCRIPTIONS_PER_TYPE = new Map<
  CollectionItemTypeValues,
  string
>();
ARIA_DESCRIPTIONS_PER_TYPE.set(CollectionItemType.document, 'a document');
ARIA_DESCRIPTIONS_PER_TYPE.set(CollectionItemType.folder, 'a folder');
ARIA_DESCRIPTIONS_PER_TYPE.set(CollectionItemType.notebook, 'a notebook');
