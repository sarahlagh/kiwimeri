import { msg } from '@lingui/core/macro';
import {
  add,
  albums,
  bugOutline,
  checkmarkOutline,
  close,
  cloudDownloadOutline,
  cloudUploadOutline,
  constructSharp,
  createOutline,
  documentTextOutline,
  ellipsisVertical,
  exitOutline,
  folderSharp,
  helpOutline,
  home,
  homeOutline,
  locateOutline,
  moonOutline,
  moonSharp,
  openOutline,
  settingsSharp,
  trashOutline
} from 'ionicons/icons';

export const DEFAULT_SPACE_ID = 'default';
export const DEFAULT_NOTEBOOK_ID = '0';

export const ROOT_FOLDER = 'home';

// useful for showing home in modals and getting empty queries on load
export const FAKE_ROOT = 'root';

export const INTERNAL_FORMAT = 'raw';

// messages
export const ROOT_FOLDER_TITLE = msg`Home`;
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
  outsideHome: homeOutline,
  document: documentTextOutline,
  folder: folderSharp,
  itemActions: ellipsisVertical,
  goToCurrentFolder: locateOutline,
  deleteAction: trashOutline,
  moveAction: exitOutline,
  renameAction: createOutline,
  closeAction: close,
  goIntoAction: openOutline,
  addFolder: albums,
  addDocument: add,
  addGeneric: add,
  cloudUpload: cloudUploadOutline,
  cloudDownload: cloudDownloadOutline,
  ok: checkmarkOutline,
  ko: bugOutline,
  unknown: helpOutline
};
