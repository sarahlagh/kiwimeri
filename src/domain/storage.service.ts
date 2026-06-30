import { space } from '@/core/db/store';
import notebooksService from '@/domain/collection/notebooks.service';
import localChangesService from '@/domain/synchronization/local-changes.service';
import tagsService from './collection/tags.service';

class StorageService {
  public nukeSpace() {
    space.setContent([{}, {}]);
    notebooksService.initNotebooks();
    localChangesService.clear();
    tagsService.clear();
  }
}

const storageService = new StorageService();
export default storageService;
