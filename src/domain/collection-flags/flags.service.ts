import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-schema';
import notebooksService from '@/db/notebooks.service';
import { Id } from 'tinybase';
import { userPrefs } from '../user-preferences/user-preferences.service';
import { defaultNotebookFlags, NotebookFlags } from './model';

const C = SpaceTables.C;

class EffectiveFlagsService {
  public getSpaceDefaultFlags(): Required<NotebookFlags> {
    let statsEnabled = userPrefs.get<'statsEnabled'>('statsEnabled');
    if (statsEnabled === undefined) {
      statsEnabled = defaultNotebookFlags.statsEnabled;
    }
    return {
      statsEnabled
    };
  }

  public setSpaceDefaultFlags(newFlags: NotebookFlags) {
    userPrefs.set(
      'statsEnabled',
      newFlags.statsEnabled !== undefined ? newFlags.statsEnabled : null
    );
  }

  public getNotebookDefaultFlags(notebook?: Id): NotebookFlags {
    if (!notebook) {
      notebook = notebooksService.getCurrentNotebook();
    }
    const notebookFlags = space.getCell(C, notebook, 'flags');
    return notebookFlags || this.getSpaceDefaultFlags();
  }
}
export const itemFlagsService = new EffectiveFlagsService();
