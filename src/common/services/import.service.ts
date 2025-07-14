import {
  CollectionItem,
  CollectionItemResult,
  CollectionItemType,
  CollectionItemUpdate
} from '@/collection/collection';
import { ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
import formatterService from '@/format-conversion/formatter.service';
import { Unzipped, strFromU8, unzip } from 'fflate';
import { SerializedEditorState, SerializedLexicalNode } from 'lexical';

export type ZipMergeFistLevel = {
  status: 'new' | 'merged';
} & Pick<CollectionItem, 'id' | 'title' | 'type'>;

export type ZipMergeResult = {
  newItems: CollectionItem[];
  updatedItems: CollectionItemUpdate[];
  duplicates: CollectionItemResult[]; // first level duplicates only
  firstLevel: ZipMergeFistLevel[];
};

export type ZipMergeOptions = {
  createNewFolder: boolean;
  overwrite: boolean;
  removeFirstFolder?: boolean;
  newFolderName?: string;
};

class ImportService {
  public getLexicalFromContent(content: string) {
    const pagesFormatted = content.split(formatterService.getPagesSeparator());
    const doc = pagesFormatted.shift()!;
    // TODO get format as input
    const lexical = formatterService.getLexicalFromMarkdown(doc);
    const pages: SerializedEditorState<SerializedLexicalNode>[] = [];
    pagesFormatted.forEach(page => {
      pages.push(formatterService.getLexicalFromMarkdown(page));
    });
    return { doc: lexical, pages };
  }

  public parseZipData(parent: string, unzipped: Unzipped) {
    // TODO option to create notebooks, but how? right now, notebooks aren't nested, but they will be
    // only possible with meta json files included,
    // must warn user "if you export without metadata", you won't be able to reimport notebooks"
    const items: { [key: string]: CollectionItem } = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.keys(unzipped).forEach(key => {
      const isFolder = key.endsWith('/');
      const fKey = key;
      if (isFolder) {
        key = key.substring(0, key.length - 1);
      }
      let currentParent = parent;
      let parentKey = '';
      const names = key.split('/');
      const currentName = names.pop()!;
      names.forEach(name => {
        parentKey += name + '/';
      });
      if (parentKey.length > 0 && items[parentKey]) {
        currentParent = items[parentKey].id!;
      }
      if (!items[fKey]) {
        const { item, id } = isFolder
          ? collectionService.getNewFolderObj(currentParent || ROOT_FOLDER)
          : collectionService.getNewDocumentObj(currentParent || ROOT_FOLDER);

        let content: string | undefined = undefined;
        if (!isFolder) {
          content = strFromU8(unzipped[key]);
          const { doc, pages } = this.getLexicalFromContent(content);
          collectionService.setUnsavedItemLexicalContent(item, doc);
          pages.forEach((page, idx) => {
            const { item: pItem, id: pId } =
              collectionService.getNewPageObj(id);
            items[key + idx] = { ...pItem, id: pId, title: '', title_meta: '' };
            collectionService.setUnsavedItemLexicalContent(
              items[key + idx],
              page
            );
          });
        }
        items[fKey] = {
          ...item,
          id,
          // remove duplicate identifiers from the name
          title: currentName.replace(/(.*?)( \(\d*\))?\.[A-z]{1,3}$/g, '$1')
        };
      }
    });
    return { items: Object.values(items) };
  }

  public readZip(content: ArrayBuffer) {
    const zipData = new Uint8Array(content);
    return new Promise<Unzipped>((resolve, reject) => {
      unzip(zipData, {}, (err, unzipped) => {
        if (err) {
          return reject(err);
        }
        resolve(unzipped);
      });
    });
  }

  public findDuplicates(
    parent: string,
    firstLevel: Pick<ZipMergeFistLevel, 'title' | 'type'>[]
  ) {
    const itemsInCollection =
      collectionService.getBrowsableCollectionItems(parent);
    const duplicates = new Set<CollectionItemResult>();
    firstLevel.forEach(item => {
      itemsInCollection
        .filter(i => i.title === item.title && i.type === item.type)
        .forEach(dupl => {
          duplicates.add(dupl);
        });
    });
    return [...duplicates];
  }

  private isDuplicate(
    duplicates: CollectionItemResult[],
    newItem: Pick<CollectionItem, 'title' | 'type' | 'id'>
  ) {
    return duplicates.find(
      d => d.title === newItem.title && d.type === newItem.type
    );
  }

  private mergeItem(
    dupl: CollectionItemResult,
    newItem?: CollectionItem
  ): CollectionItemUpdate {
    const update = dupl as CollectionItemUpdate;
    update.updated = Date.now();
    if (newItem) {
      if (newItem.content) {
        update.content = newItem.content;
        update.content_meta = newItem.content_meta;
      }
    }
    return update;
  }

  private overwriteDuplicates(
    newItems: CollectionItem[],
    updatedItems: CollectionItemUpdate[]
  ) {
    const duplicatesMap = new Map<string, CollectionItemResult[]>();

    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i];
      if (!duplicatesMap.has(item.parent)) {
        const duplicates = this.findDuplicates(item.parent, [item]);
        duplicatesMap.set(item.parent, duplicates);
      }
      const newDuplicates = duplicatesMap.get(item.parent)!;

      const dupl = this.isDuplicate(newDuplicates, item);
      if (dupl) {
        // don't keep duplicate in array
        newDuplicates.splice(
          newDuplicates.findIndex(d => d === dupl),
          1
        );
        updatedItems.push(this.mergeItem(dupl, item)); // add dupl to updated items
        newItems.splice(i, 1); // remove dupl from new items
        i--;
        // update dupl children
        newItems
          .filter(newItem => newItem.parent === item.id)
          .forEach(newItem => (newItem.parent = dupl.id));
      }
    }
  }

  private mergeZipItems(
    items: CollectionItem[],
    parent: string,
    options: ZipMergeOptions
  ) {
    const firstLevelItems = items.filter(item => item.parent === parent);
    // check duplicates for each item
    const duplicates = this.findDuplicates(parent, firstLevelItems);

    // if no duplicates, or option to create new without overwrite:
    if (duplicates.length === 0 || !options.overwrite) {
      const firstLevel: ZipMergeFistLevel[] = [
        ...firstLevelItems.map(
          item => ({ ...item, status: 'new' }) as ZipMergeFistLevel
        )
      ];
      const newItems = [...items];

      return {
        newItems,
        updatedItems: [],
        duplicates,
        firstLevel
      };
    } else {
      // if has duplicates and option to overwrite:
      const updatedItems: CollectionItemUpdate[] = [];
      const newItems = [...items];
      this.overwriteDuplicates(newItems, updatedItems);

      const firstLevel: ZipMergeFistLevel[] = [
        ...updatedItems
          .filter(item => item.parent === parent)
          .map(item => ({ ...item, status: 'merged' }) as ZipMergeFistLevel),
        ...newItems
          .filter(item => item.parent === parent)
          .map(item => ({ ...item, status: 'new' }) as ZipMergeFistLevel)
      ];

      return {
        newItems,
        updatedItems,
        duplicates,
        firstLevel
      };
    }
  }

  private removeFirstFolder(items: CollectionItem[], parent: string) {
    const firstLayer = items.filter(item => item.parent === parent);
    if (
      firstLayer.length !== 1 ||
      firstLayer[0].type !== CollectionItemType.folder
    ) {
      console.warn(
        '[import] option to remove first folder requested, but zip has a non compliant structure'
      );
      return;
    }
    // remove the first layer
    items.splice(items.indexOf(firstLayer[0]), 1);
    // update its children
    items
      .filter(item => item.parent === firstLayer[0].id)
      .forEach(item => (item.parent = parent));
  }

  private createNewFolder(
    items: CollectionItem[],
    parent: string,
    zipName: string,
    options: ZipMergeOptions
  ) {
    const firstLayer = items.filter(item => item.parent === parent);
    const { item, id } = collectionService.getNewFolderObj(parent);
    item.title = options.newFolderName || zipName;
    items.unshift({ ...item, id });
    firstLayer.forEach(item => (item.parent = id));
  }

  public mergeZipItemsWithCollection(
    zipName: string,
    importedItems: CollectionItem[],
    parent: string,
    options: ZipMergeOptions
  ): ZipMergeResult {
    const items = structuredClone(importedItems);

    if (options.removeFirstFolder === true) {
      this.removeFirstFolder(items, parent);
    }

    if (options.createNewFolder === true) {
      this.createNewFolder(items, parent, zipName, options);
    }

    return this.mergeZipItems(items, parent, options);
  }
}

export const importService = new ImportService();
