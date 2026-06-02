import { DEFAULT_NOTEBOOK_ID, DEFAULT_SPACE_ID } from '@/constants';
import { store } from '@/core/db/store';
import collectionService from './collection.service';
import { useCellWithRef, useStoreValueWithDefault } from './tinybase/hooks';

class NavService {
  private readonly storeId = 'store';
  private readonly spacesTable = 'spaces';

  public getCurrentFolder() {
    return (
      (store
        .getCell(this.spacesTable, DEFAULT_SPACE_ID, 'currentFolder')
        ?.valueOf() as string) || DEFAULT_NOTEBOOK_ID
    );
  }

  public useCurrentFolder() {
    return (
      useCellWithRef<string>(
        this.storeId,
        this.spacesTable,
        DEFAULT_SPACE_ID,
        'currentFolder'
      ) || DEFAULT_NOTEBOOK_ID
    );
  }

  public setCurrentFolder(folder: string) {
    store.transaction(() => {
      store.setCell(
        this.spacesTable,
        DEFAULT_SPACE_ID,
        'currentFolder',
        folder
      );
      const breadcrumb = collectionService.getBreadcrumb(folder);
      store.setCell(
        this.spacesTable,
        DEFAULT_SPACE_ID,
        'currentNotebook',
        breadcrumb[0]
      );
    });
  }

  public getCurrentDocument() {
    return (
      (store
        .getCell(this.spacesTable, DEFAULT_SPACE_ID, 'currentDocument')
        ?.valueOf() as string) || undefined
    );
  }

  public setCurrentDocument(doc?: string) {
    if (doc) {
      store.setCell(this.spacesTable, DEFAULT_SPACE_ID, 'currentDocument', doc);
    } else {
      store.delCell(this.spacesTable, DEFAULT_SPACE_ID, 'currentDocument');
    }
  }

  public setRememberLastRoute(value: boolean) {
    store.setValue('rememberLastRoute', value);
  }

  public useRememberLastRoute() {
    return useStoreValueWithDefault('rememberLastRoute', true);
  }
}

const navService = new NavService();
export default navService;
