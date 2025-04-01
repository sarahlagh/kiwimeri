import { msg } from '@lingui/core/macro';
import { ellipsisVertical, locateOutline } from 'ionicons/icons';

export const ROOT_FOLDER = 'home';
export const ROOT_FOLDER_TITLE = msg`Home`;

// useful for showing home in modals and getting empty queries on load
export const FAKE_ROOT = 'root';

export const APPICONS = {
  nodeActions: ellipsisVertical,
  goToCurrentFolder: locateOutline
};
