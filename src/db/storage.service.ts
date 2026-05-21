import { space } from '@/core/db/store';
import localChangesService from '@/domain/local-changes/local-changes.service';
import notebooksService from './notebooks.service';
import tagsService from './tags.service';

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
