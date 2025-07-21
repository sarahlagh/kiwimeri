import { msg } from '@lingui/core/macro';
import {
  add,
  albums,
  arrowDown,
  arrowUp,
  bugOutline,
  checkmarkOutline,
  close,
  cloudDownloadOutline,
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
  sendOutline,
  settingsSharp,
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

export const ROOT_FOLDER = 'home';
export const ROOT_NOTEBOOK = 'root';

export const META_JSON = 'meta.json';

// useful for showing home in modals and getting empty queries on load
export const FAKE_ROOT = 'root';

export const INTERNAL_FORMAT = 'raw';

export const CONFLICT_STR = '[!] ';

// messages
export const ROOT_FOLDER_TITLE = msg`Home`;
export const DEFAULT_NOTEBOOK_NAME = msg`Default`;
export const NEW_DOC_TITLE = msg`New document`;
export const NEW_FOLDER_TITLE = msg`New folder`;

// icons
export const APPICONS = {
  collectionPage: folderSharp,
  settingsPage: settingsSharp,
  debugPage: constructSharp,
  themeLight: moonOutline,
  themeDark: moonSharp,
  home: home,
  library: libraryOutline,
  document: documentTextOutline,
  folder: folderSharp,
  notebook: fileTrayStackedOutline,
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
  cloudUpload: cloudUploadOutline,
  cloudDownload: cloudDownloadOutline,
  ok: checkmarkOutline,
  ko: bugOutline,
  unknown: helpOutline,
  moveUp: arrowUp,
  moveDown: arrowDown,
  warning: warningOutline,
  info: informationCircleOutline,
  tags: pricetagsOutline,
  export: sendOutline,
  import: downloadOutline
};

export const APPICONS_PER_TYPE = new Map<CollectionItemTypeValues, string>();
APPICONS_PER_TYPE.set(CollectionItemType.document, APPICONS.document);
APPICONS_PER_TYPE.set(CollectionItemType.folder, APPICONS.folder);
APPICONS_PER_TYPE.set(CollectionItemType.notebook, APPICONS.notebook);
