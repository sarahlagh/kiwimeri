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
    const fileTree: any = {}; // object that represents the item in tree structure
    Object.keys(unzipped).forEach(key => {
      const isFolder = key.endsWith('/');
      const fKey = key;
      if (isFolder) {
        key = key.substring(0, key.length - 1);
      }
      let currentParent = parent;
      let parentKey = '';
      const names = key.split('/');
      let node = fileTree;
      const currentName = names.pop()!;
      names.forEach(name => {
        parentKey += name + '/';
        node[name] = {
          type: CollectionItemType.folder,
          id: items[parentKey].id
        };
        node = node[name];
      });
      if (parentKey.length > 0 && items[parentKey]) {
        currentParent = items[parentKey].id!;
      }
      if (!items[fKey]) {
        const { item, id } = isFolder
          ? collectionService.getNewFolderObj(currentParent || ROOT_FOLDER)
          : collectionService.getNewDocumentObj(currentParent || ROOT_FOLDER);

        let content: string | undefined = undefined;
        node[currentName] = {
          type: isFolder
            ? CollectionItemType.folder
            : CollectionItemType.document,
          id
        };
        if (!isFolder) {
          content = strFromU8(unzipped[key]);
          const { doc, pages } = this.getLexicalFromContent(content);
          collectionService.setUnsavedItemLexicalContent(item, doc);
          pages.forEach((page, idx) => {
            const { item: pItem, id: pId } =
              collectionService.getNewPageObj(id);
            node[currentName][idx] = {
              type: CollectionItemType.page,
              id: pId
            };
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
    return { items: Object.values(items), fileTree };
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
    let duplicates: CollectionItemResult[] = [];
    firstLevel.forEach(item => {
      const dupl = itemsInCollection.filter(
        i => i.title === item.title && i.type === item.type
      );
      duplicates = [...duplicates, ...dupl];
    });
    return duplicates;
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
    folderId: string,
    newItems: CollectionItem[],
    updatedItems: CollectionItemUpdate[]
  ) {
    const newDuplicates = this.findDuplicates(folderId, [
      ...newItems.filter(item => item.parent === folderId)
    ]);
    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i];
      const dupl = this.isDuplicate(newDuplicates, item);
      if (dupl) {
        updatedItems.push(this.mergeItem(dupl, item)); // add dupl to updated items
        newItems.splice(i, 1); // remove dupl from new items
        i--;
        // TODO if folder find duplicates inside
      }
    }

    const nextLevel = newItems.filter(i => i.parent !== folderId);
    if (nextLevel.length > 0) {
      // TODO recursive
    }
  }

  private mergeZipItemsWithCreateNewFolder(
    zipName: string,
    items: CollectionItem[],
    parent: string,
    options: ZipMergeOptions
  ) {
    // check duplicates
    const duplicates = this.findDuplicates(parent, [
      {
        title: options.newFolderName || zipName,
        type: CollectionItemType.folder
      }
    ]);

    // if no duplicates, or option to create new without overwrite:
    if (duplicates.length === 0 || !options.overwrite) {
      const { item, id } = collectionService.getNewFolderObj(parent);
      const newFolder = {
        ...item,
        id,
        title: options.newFolderName || zipName
      };
      const firstLevel: ZipMergeFistLevel[] = [
        {
          ...newFolder,
          status: 'new'
        }
      ];
      const newItems = [
        newFolder,
        ...items.map(item => {
          if (item.parent === parent) {
            item.parent = newFolder.id!;
          }
          return item;
        })
      ];

      return {
        newItems,
        updatedItems: [],
        duplicates,
        firstLevel
      };
    } else {
      // if has duplicates and option to overwrite:
      const updatedItems: CollectionItemUpdate[] = [];
      const newParent = duplicates[0];

      const firstLevel: ZipMergeFistLevel[] = [
        {
          ...newParent,
          status: 'merged'
        }
      ];

      // update parent of first level items
      const newItems = [
        ...items.map(item => {
          if (item.parent === parent) {
            item.parent = newParent.id!;
          }
          return item;
        })
      ];

      // add duplicate to updatedItems
      updatedItems.push(this.mergeItem(newParent));

      // look for duplicates beyond first level
      this.overwriteDuplicates(newParent.id, newItems, updatedItems);

      return {
        newItems,
        updatedItems,
        duplicates,
        firstLevel
      };
    }
  }

  private mergeZipItemsWithNoNewFolder(
    items: CollectionItem[],
    parent: string,
    options: ZipMergeOptions
  ) {
    // check duplicates for each item
    const duplicates = this.findDuplicates(parent, items);

    // if no duplicates, or option to create new without overwrite:
    if (duplicates.length === 0 || !options.overwrite) {
      const firstLevel: ZipMergeFistLevel[] = [
        ...items.map(item => ({ ...item, status: 'new' }) as ZipMergeFistLevel)
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
      this.overwriteDuplicates(parent, newItems, updatedItems);

      const firstLevel: ZipMergeFistLevel[] = [
        ...newItems.map(
          item => ({ ...item, status: 'new' }) as ZipMergeFistLevel
        ),
        ...updatedItems.map(
          item => ({ ...item, status: 'merged' }) as ZipMergeFistLevel
        )
      ];

      return {
        newItems,
        updatedItems,
        duplicates,
        firstLevel
      };
    }
  }

  public mergeZipItemsWithCollection(
    zipName: string,
    importedItems: CollectionItem[],
    parent: string,
    options: ZipMergeOptions
  ): ZipMergeResult {
    const items = structuredClone(importedItems);

    // TODO check option to remove first folder

    if (options.createNewFolder) {
      return this.mergeZipItemsWithCreateNewFolder(
        zipName,
        items,
        parent,
        options
      );
    }
    return this.mergeZipItemsWithNoNewFolder(items, parent, options);
  }
}

export const importService = new ImportService();
