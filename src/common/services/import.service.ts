import {
  CollectionItem,
  CollectionItemResult,
  CollectionItemType,
  CollectionItemTypeValues,
  CollectionItemUpdate
} from '@/collection/collection';
import { META_JSON } from '@/constants';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import storageService from '@/db/storage.service';
import formatterService from '@/format-conversion/formatter.service';
import { Unzipped, strFromU8, unzip } from 'fflate';
import { SerializedEditorState, SerializedLexicalNode } from 'lexical';
import { ZipMetadata } from './export.service';

export type ZipMergeFistLevel = {
  status: 'new' | 'merged';
} & Pick<CollectionItem, 'id' | 'title' | 'type' | 'created' | 'updated'>;

export type ZipParsedData = {
  zipName: string;
  items: CollectionItem[];
  rootMeta?: ZipMetadata;
};

export type ZipMergeResult = {
  newItems: CollectionItem[];
  updatedItems: CollectionItemUpdate[];
  duplicates: CollectionItemResult[]; // first level duplicates only
  firstLevel: ZipMergeFistLevel[];
};

export type ZipParseOptions = {
  ignoreMetadata?: boolean;
  detectInlinedPages?: boolean;
  titleRemoveDuplicateIdentifiers?: boolean;
  titleRemoveExtension?: boolean;
};

export type ZipMergeOptions = {
  createNotebook?: boolean;
  createNewFolder?: boolean;
  overwrite?: boolean;
  removeFirstFolder?: boolean;
  newFolderName?: string;
};

export type ZipImportOptions = ZipParseOptions & ZipMergeOptions;

export type ZipMergeCommitOptions = {
  deleteExistingPages?: boolean;
};

class ImportService {
  private readonly zipRoot = 'zip-root';
  private readonly defaultOpts: ZipImportOptions & ZipMergeCommitOptions = {
    // parse opts
    ignoreMetadata: false,
    createNotebook: false,
    detectInlinedPages: true,
    titleRemoveDuplicateIdentifiers: true,
    titleRemoveExtension: true,
    // merge opts
    overwrite: false,
    createNewFolder: false,
    removeFirstFolder: false,
    // commit opts
    deleteExistingPages: true
  };

  public getLexicalFromContent(content: string, opts?: ZipParseOptions) {
    // TODO get format as input
    if (!opts) {
      opts = this.defaultOpts;
    } else {
      opts = { ...this.defaultOpts, ...opts };
    }
    if (opts.detectInlinedPages) {
      const pagesFormatted = content.split(
        formatterService.getPagesSeparator()
      );
      const doc = pagesFormatted.shift()!;
      const lexical = formatterService.getLexicalFromMarkdown(doc);
      const pages: SerializedEditorState<SerializedLexicalNode>[] = [];
      pagesFormatted.forEach(page => {
        pages.push(formatterService.getLexicalFromMarkdown(page));
      });
      return { doc: lexical, pages };
    }
    return { doc: formatterService.getLexicalFromMarkdown(content), pages: [] };
  }

  private fillInMeta(item: CollectionItem, meta: ZipMetadata) {
    if (meta.title) {
      item.title = meta.title;
    }
    if (meta.created) {
      item.created = meta.created;
    }
    if (meta.updated) {
      item.updated = meta.updated;
    }
    if (meta.tags) {
      item.tags = meta.tags;
    }
    if (meta.type) {
      item.type = meta.type;
    }
  }

  private fillInFilesMeta(
    item: CollectionItem,
    key: string,
    metaMap: Map<string, ZipMetadata>
  ) {
    if (
      metaMap.get(item.parent)?.files &&
      metaMap.get(item.parent)!.files![key] !== undefined
    ) {
      const meta = metaMap.get(item.parent)!.files![key]!;
      this.fillInMeta(item, meta);
    }
  }

  public parseZipData(
    zipName: string,
    unzipped: Unzipped,
    opts?: ZipParseOptions
  ): ZipParsedData {
    if (!opts) {
      opts = this.defaultOpts;
    } else {
      opts = { ...this.defaultOpts, ...opts };
    }

    const parent = this.zipRoot;

    const zipNameFinal = zipName.replace(/(.*)\.(zip|ZIP)$/g, '$1');
    const metaMap = new Map<string, ZipMetadata>();
    const items: { [key: string]: CollectionItem } = {};

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
      if (opts.ignoreMetadata === false && currentName === META_JSON) {
        const meta: ZipMetadata = JSON.parse(strFromU8(unzipped[fKey]));
        metaMap.set(currentParent, meta);
        return;
      }
      if (!items[fKey]) {
        const { item, id } = isFolder
          ? collectionService.getNewFolderObj(currentParent)
          : collectionService.getNewDocumentObj(currentParent);

        let content: string | undefined = undefined;

        let title = currentName;
        if (opts.titleRemoveExtension) {
          title = title.replace(/(.*?)\.[A-z]{1,3}$/g, '$1');
        }
        if (opts.titleRemoveDuplicateIdentifiers) {
          title = title.replace(/(.*?)(?: \(\d*\))?(\.[A-z]{1,3})?$/g, '$1$2');
        }
        items[fKey] = {
          ...item,
          id,
          title
        };

        if (!isFolder) {
          content = strFromU8(unzipped[key]);
          const { doc, pages } = this.getLexicalFromContent(content, opts);
          collectionService.setUnsavedItemLexicalContent(items[fKey], doc);
          pages.forEach((page, idx) => {
            const { item: pItem, id: pId } =
              collectionService.getNewPageObj(id);
            items[key + idx] = {
              ...pItem,
              id: pId,
              title: '',
              title_meta: ''
            };
            collectionService.setUnsavedItemLexicalContent(
              items[key + idx],
              page
            );
          });
        }
      }
    });

    // use meta.json files to update some metadatas
    Object.keys(items).forEach(key => {
      const keys = key.split('/');
      if (keys[keys.length - 1] !== '') {
        // is item
        this.fillInFilesMeta(items[key], keys[keys.length - 1], metaMap);
      } else {
        // is folder or notebook
        if (metaMap.has(items[key].id!)) {
          const meta = metaMap.get(items[key].id!)!;
          this.fillInMeta(items[key], meta);
        }
      }
    });

    return {
      zipName: zipNameFinal,
      items: Object.values(items),
      rootMeta: metaMap.get(parent)
    };
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
      if (newItem.tags) {
        update.tags = newItem.tags;
        update.tags_meta = newItem.tags_meta;
      }
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
        const siblings = newItems.filter(item => item.parent === item.parent);
        const duplicates = this.findDuplicates(item.parent, siblings);
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

  private mergeZipItemsWithOptions(
    items: CollectionItem[],
    parent: string,
    options: ZipMergeOptions
  ) {
    const firstLevelItems = items.filter(item => item.parent === parent);
    // check duplicates for each item
    const duplicates = this.findDuplicates(parent, firstLevelItems);
    const newItems = [...items];
    const updatedItems: CollectionItemUpdate[] = [];
    let firstLevel: ZipMergeFistLevel[] = [];

    // if no duplicates, or option to create new without overwrite:
    if (duplicates.length === 0 || !options.overwrite) {
      firstLevel = [
        ...firstLevelItems.map(
          item => ({ ...item, status: 'new' }) as ZipMergeFistLevel
        )
      ];
    } else {
      // if has duplicates and option to overwrite:
      this.overwriteDuplicates(newItems, updatedItems);
      firstLevel = [
        ...updatedItems
          .filter(item => item.parent === parent)
          .map(item => ({ ...item, status: 'merged' }) as ZipMergeFistLevel),
        ...newItems
          .filter(item => item.parent === parent)
          .map(item => ({ ...item, status: 'new' }) as ZipMergeFistLevel)
      ];
    }
    return {
      newItems,
      updatedItems,
      duplicates,
      firstLevel
    };
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

  private createNewParent(
    type: CollectionItemTypeValues,
    items: CollectionItem[],
    parent: string,
    zipName: string,
    options: ZipMergeOptions,
    rootMeta?: ZipMetadata
  ) {
    const firstLayer = items.filter(item => item.parent === parent);
    const { item, id } =
      type === CollectionItemType.folder
        ? collectionService.getNewFolderObj(parent)
        : notebooksService.getNewNotebookObj(parent);
    item.title = '';
    if (rootMeta) {
      this.fillInMeta(item, rootMeta);
    }
    if (options.newFolderName || item.title === '') {
      item.title = options.newFolderName || zipName;
    }
    items.unshift({ ...item, id });
    firstLayer.forEach(item => (item.parent = id));
    return id;
  }

  public mergeZipItems(
    mergeIntoParent: string,
    zipData: ZipParsedData,
    opts: ZipMergeOptions
  ): ZipMergeResult {
    opts = { ...this.defaultOpts, ...opts };

    const items = structuredClone(zipData.items);
    let parent = mergeIntoParent;

    // zipRoot is a fake temporary parent, replace
    items
      .filter(i => i.parent === this.zipRoot)
      .forEach(i => (i.parent = parent));

    if (opts.removeFirstFolder === true) {
      this.removeFirstFolder(items, parent);
    }

    if (zipData.rootMeta) {
      this.createNewParent(
        zipData.rootMeta.type || CollectionItemType.folder,
        items,
        parent,
        zipData.zipName,
        opts,
        zipData.rootMeta
      );
      if (opts.createNotebook) {
        // force notebook type if zipData.rootMeta.type was folder
        items[0].type = CollectionItemType.notebook;
        // items[0].parent = ROOT_COLLECTION;
        // parent = id;
      }
    } else {
      if (opts.createNotebook === true) {
        const id = this.createNewParent(
          CollectionItemType.notebook,
          items,
          parent,
          zipData.zipName,
          opts
        );
        parent = id;
      }

      if (opts.createNewFolder === true) {
        this.createNewParent(
          CollectionItemType.folder,
          items,
          parent,
          zipData.zipName,
          opts
        );
      }
    }

    return this.mergeZipItemsWithOptions(items, parent, opts);
  }

  public commitMergeResult(
    zipMerge: ZipMergeResult,
    commitOpts?: ZipMergeCommitOptions
  ) {
    if (!commitOpts) {
      commitOpts = this.defaultOpts;
    } else {
      commitOpts = { ...this.defaultOpts, ...commitOpts };
    }

    storageService.getSpace().transaction(() => {
      if (commitOpts.deleteExistingPages) {
        zipMerge.updatedItems
          .filter(item => item.type === CollectionItemType.document)
          .forEach(item => {
            const pages = collectionService.getDocumentPages(item.id);
            pages.forEach(page => {
              collectionService.deleteItem(page.id);
            });
          });
      }
      collectionService.saveItems(zipMerge.newItems);
      collectionService.saveItems(zipMerge.updatedItems);
    });
  }

  public commitDocument(
    lexical: SerializedEditorState<SerializedLexicalNode>,
    pages: SerializedEditorState<SerializedLexicalNode>[],
    parent: string,
    title: string,
    itemId?: string,
    commitOpts: ZipMergeCommitOptions = this.defaultOpts
  ) {
    storageService.getSpace().transaction(() => {
      if (itemId) {
        console.debug(
          'overwriting document with the same file name',
          parent,
          itemId
        );
        // delete exising pages
        if (commitOpts.deleteExistingPages) {
          const pages = collectionService.getDocumentPages(itemId);
          pages.forEach(page => {
            collectionService.deleteItem(page.id);
          });
        }
      } else {
        itemId = collectionService.addDocument(parent);
        collectionService.setItemTitle(itemId, title);
      }
      collectionService.setItemLexicalContent(itemId, lexical);

      pages.forEach(page => {
        const pageId = collectionService.addPage(itemId!);
        collectionService.setItemLexicalContent(pageId, page);
      });
    });
    return itemId;
  }
}

export const importService = new ImportService();
