import { ROOT_FOLDER } from '@/constants';
import { Id } from 'tinybase/with-schemas';
import collectionService from './collection.service';
import storageService from './storage.service';

class TagsService {
  private itemsPerTags = new Map<string, string[]>();

  public reBuildTags() {
    this.itemsPerTags.clear();
    const collection = collectionService.getCollectionItems(ROOT_FOLDER);
    collection
      .filter(item => item.tags !== undefined && item.tags.length > 0)
      .forEach(item => {
        item.tags!.split(',').forEach(t => {
          if (!this.itemsPerTags.has(t)) {
            this.itemsPerTags.set(t, []);
          }
          this.itemsPerTags.get(t)?.push(item.id);
        });
      });
    console.debug('[tags] cache rebuilt', this.itemsPerTags);
  }

  public getTags() {
    return [...this.itemsPerTags.keys()];
  }

  public getItemsPerTag(tag: string) {
    return [...(this.itemsPerTags.get(tag) || [])];
  }

  public renameTag(tag1: string, tag2: string) {
    if (
      this.itemsPerTags.has(tag1) &&
      this.itemsPerTags.get(tag1)!.length > 0
    ) {
      // update all rows
      storageService.getSpace().transaction(() => {
        this.itemsPerTags.get(tag1)!.forEach(rowId => {
          collectionService.renameItemTag(rowId, tag1, tag2);
        });
      });
      this.reBuildTags();
    }
  }

  public addItemTag(rowId: Id, tag: string) {
    collectionService.addItemTag(rowId, tag);
    this.reBuildTags(); // TODO optimize
  }

  public delItemTag(rowId: Id, tag: string) {
    collectionService.delItemTag(rowId, tag);
    this.reBuildTags(); // TODO optimize
  }
}

const tagsService = new TagsService();
export default tagsService;
