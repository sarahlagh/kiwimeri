import { msg } from '@lingui/core/macro';
import {
  add,
  albums,
  close,
  constructSharp,
  createOutline,
  documentTextOutline,
  ellipsisVertical,
  exitOutline,
  folderSharp,
  home,
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
export const ROOT_FOLDER_TITLE = msg`Home`;

// useful for showing home in modals and getting empty queries on load
export const FAKE_ROOT = 'root';

export const APPICONS = {
  collectionPage: folderSharp,
  settingsPage: settingsSharp,
  debugPage: constructSharp,
  themeLight: moonOutline,
  themeDark: moonSharp,
  home: home,
  document: documentTextOutline,
  folder: folderSharp,
  nodeActions: ellipsisVertical,
  goToCurrentFolder: locateOutline,
  deleteAction: trashOutline,
  moveAction: exitOutline,
  renameAction: createOutline,
  closeAction: close,
  goIntoAction: openOutline,
  addFolder: albums,
  addDocument: add,
  addNodeGeneric: add
};
