import { META_JSON, ROOT_COLLECTION } from '@/constants';
import { space } from '@/core/db/store';
import { setMetaField } from '@/core/db/types';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import storageService from '@/db/storage.service';
import {
  CollectionItem,
  CollectionItemResult,
  CollectionItemType,
  CollectionItemTypeValues,
  CollectionItemUpdatableFields,
  CollectionItemUpdate,
  isDocument,
  isFolder,
  isNotebook,
  isParent
} from '@/domain/collection/model';
import formatConverter from '@/format-conversion/format-converter.service';
import { Unzipped, strFromU8, unzip } from 'fflate';
import { SerializedEditorState, SerializedLexicalNode } from 'lexical';
import {
  ZipImportOptions,
  ZipMergeFistLevel,
  ZipMergeOptions,
  ZipMergeResult,
  ZipParseError,
  ZipParseOptions,
  ZipParsedData,
  ZipParsedMetadata
} from '../model/model-import';
import { validateMetadataFile } from './metadata-validation';

class ImportService {
  private readonly zipRoot = 'zip-root';
  private readonly defaultOpts: ZipImportOptions = {
    // parse opts
    ignoreMetadata: false,
    titleRemoveDuplicateIdentifiers: true,
    titleRemoveExtension: true,
    // merge opts
    createNotebook: false,
    removeNotebooks: false,
    overwrite: false,
    createNewFolder: false,
    removeFirstFolder: false
  };

  public parseNonLexicalContent(content: string, opts?: ZipParseOptions) {
    // TODO get format as input
    if (!opts) {
      opts = this.defaultOpts;
    } else {
      opts = { ...this.defaultOpts, ...opts };
    }
    const { obj, errors } = formatConverter.fromMarkdown(content);
    if (errors?.length || 0 > 0) {
      return { errors };
    }
    return { doc: obj };
  }

  // TODO less manual
  private fillInMeta(
    item: CollectionItem,
    meta: ZipParsedMetadata,
    parentItem?: CollectionItem,
    ignoreType = false
  ) {
    if (meta.type && !ignoreType) {
      item.type = meta.type;
    }
    if (parentItem) {
      item.parentId = parentItem.id!;
    }
    if (meta.title) {
      item.title = meta.title;
    }
    if (meta.createdAt) {
      item.createdAt = meta.createdAt;
    }
    if (meta.updatedAt) {
      item.updatedAt = meta.updatedAt;
      // all the _meta too,
      CollectionItemUpdatableFields.forEach(field => {
        if (item[field]) {
          item[`${field}_meta`] = setMetaField(
            item.updatedAt,
            `${item[field]}`
          );
        }
      });
    }
    if (meta.tags) {
      item.tags = meta.tags;
    }
    if (meta.order) {
      item.order = meta.order;
    }
    if (meta.settings) {
      item.settings = meta.settings;
    }
  }

  private getItemTitle(currentName: string, opts: ZipParseOptions) {
    let title = currentName;
    if (opts.titleRemoveExtension) {
      title = title.replace(/(.*?)\.[A-z]{1,3}$/g, '$1');
    }
    if (opts.titleRemoveDuplicateIdentifiers) {
      title = title.replace(/(.*?)(?: \(\d*\))?(\.[A-z]{1,3})?$/g, '$1$2');
    }
    return title;
  }

  private createObj(
    isFolder: boolean,
    currentName: string,
    closestParent: string,
    opts: ZipParseOptions
  ): CollectionItem {
    const { item, id } = isFolder
      ? collectionService.getNewFolderObj(closestParent)
      : collectionService.getNewDocumentObj(closestParent);

    const title = this.getItemTitle(currentName, opts);
    return {
      ...item,
      id,
      title
    };
  }

  private parseItemContent(
    unzipped: Unzipped,
    itemKey: string,
    items: Map<string, CollectionItem>,
    errors: ZipParseError[],
    opts: ZipParseOptions
  ) {
    const item = items.get(itemKey)!;
    try {
      const content = strFromU8(unzipped[itemKey]);
      const { doc, errors: parseErrors } = this.parseNonLexicalContent(
        content,
        opts
      );
      if (parseErrors?.length || 0 > 0) {
        console.error(parseErrors);
        errors.push({
          family: 'parse_error',
          path: itemKey
        });
        return;
      }
      collectionService.setUnsavedItemLexicalContent(item, doc!);
    } catch (e) {
      console.error(e);
      errors.push({
        family: 'parse_error',
        path: itemKey
      });
    }
  }

  private parseMetadataFile(
    unzipped: Unzipped,
    itemKey: string,
    parentPath: string,
    items: Map<string, CollectionItem>,
    metaMap: Map<string, ZipParsedMetadata>,
    errors: ZipParseError[]
  ) {
    try {
      // handle meta.json
      const origMeta = JSON.parse(strFromU8(unzipped[itemKey]));
      // use zod to validate schema
      validateMetadataFile(origMeta);
      const meta: ZipParsedMetadata = {
        parentKey: parentPath,
        ...origMeta
      };
      metaMap.set(parentPath, meta);
      if (items.has(parentPath)) {
        this.fillInMeta(items.get(parentPath)!, meta);
      }
      // fill in meta for siblings
      if (meta.files) {
        const docTags = new Set<string>();
        Object.keys(meta.files).forEach(filename => {
          let parentKey: string | undefined = undefined;
          const metaFile = meta.files![filename];
          const metaFilePath = `${parentPath}${filename}`;

          if (items.has(metaFilePath)) {
            const item = items.get(metaFilePath)!;
            this.fillInMeta(item, metaFile);
          }
          // if document update its parent
          if (metaFile.type === CollectionItemType.document) {
            parentKey = parentPath;
            if (items.has(metaFilePath) && items.get(parentKey)?.id) {
              items.get(metaFilePath)!.parentId = items.get(parentKey)!.id!;
            }
            if (metaFile.tags) {
              metaFile.tags.forEach(tag => {
                docTags.add(tag);
              });
            }
          }
          metaMap.set(metaFilePath, { parentKey, ...metaFile });
        });
      }
    } catch (e) {
      console.error(e);
      errors.push({
        family: 'parse_error',
        path: itemKey
      });
    }
  }

  private checkErrors(
    errors: ZipParseError[],
    lastDirKey: string,
    items: Map<string, CollectionItem>,
    levelMap: Map<string, string[]>,
    metaMap: Map<string, ZipParsedMetadata>
  ) {
    const item = items.get(lastDirKey);
    const meta = metaMap.get(lastDirKey);
    const level = levelMap.get(lastDirKey)!;

    if (!meta) {
      return;
    }

    const parentType: CollectionItemTypeValues =
      item?.type || meta.type || CollectionItemType.folder;

    const metaFilePath = metaMap.has(lastDirKey)
      ? `${lastDirKey}${META_JSON}`
      : lastDirKey;

    if (!isParent(parentType)) {
      return errors.push({
        family: 'incorrect_meta',
        code: 'incorrect_parent_type',
        path: metaFilePath
      });
    }

    for (const child of level) {
      if (child === META_JSON || child.endsWith(`/${META_JSON}`)) {
        continue;
      }
      const isFileInZip = !child.endsWith('/');
      const childItem = items.get(child);
      const childMeta = metaMap.get(child);

      const childType =
        childItem?.type ||
        childMeta?.type ||
        (isFileInZip ? CollectionItemType.document : CollectionItemType.folder);

      if (isFileInZip) {
        if (!isDocument({ type: childType })) {
          return errors.push({
            family: 'incorrect_meta',
            code: 'incorrect_child_type',
            path: metaFilePath
          });
        }
      } else {
        // if is directory in zip
        const childMetaFilePath = childMeta ? `${child}${META_JSON}` : child;

        if (isFolder(childType) && !isParent(parentType)) {
          return errors.push({
            family: 'incorrect_meta',
            code: 'orphaned_folder',
            path: childMetaFilePath
          });
        }
        if (
          isNotebook(childType) &&
          !isNotebook(parentType) &&
          lastDirKey.length > 0
        ) {
          return errors.push({
            family: 'incorrect_meta',
            code: 'orphaned_notebook',
            path: childMetaFilePath
          });
        }
      }
    }

    return errors.length;
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

    const finalZipName = zipName.replace(/(.*)\.(zip|ZIP)$/g, '$1');
    const metaMap = new Map<string, ZipParsedMetadata>();
    const levelMap = new Map<string, string[]>();
    const items = new Map<string, CollectionItem>();
    const errors: ZipParseError[] = [];

    const firstLevel: CollectionItem[] = [];

    let lastLevel = -1;
    let lastDirectory = '';
    let hasMetadata = false;
    levelMap.set('', []);

    Object.keys(unzipped).forEach(itemKey => {
      const isDirectoryInZip = itemKey.endsWith('/');
      let path = itemKey;
      if (isDirectoryInZip) {
        path = path.substring(0, itemKey.length - 1);
      }
      const names = path.split('/');
      const level = names.length;
      const currentName = names.pop()!;
      const parentPath = names.join('/') + (names.length > 0 ? '/' : '');

      const closestParent = items.get(parentPath)?.id || this.zipRoot;
      console.debug(itemKey);

      const item = this.createObj(
        isDirectoryInZip,
        currentName,
        closestParent,
        opts
      );
      if (isDirectoryInZip && !levelMap.has(itemKey)) {
        levelMap.set(itemKey, []);
      }
      levelMap.get(parentPath)?.push(itemKey);

      if (isDirectoryInZip) {
        items.set(itemKey, item);
        if (!opts.ignoreMetadata && metaMap.has(itemKey)) {
          const meta = metaMap.get(itemKey)!;
          this.fillInMeta(
            item,
            meta!,
            meta.parentKey ? items.get(meta.parentKey!) : undefined
          );
        }
      } else if (currentName !== META_JSON || opts.ignoreMetadata) {
        // is document & not meta.json
        items.set(itemKey, item);
        this.parseItemContent(unzipped, itemKey, items, errors, opts);

        if (!opts.ignoreMetadata && metaMap.has(itemKey)) {
          const meta = metaMap.get(itemKey)!;
          this.fillInMeta(
            item,
            meta,
            meta.parentKey ? items.get(meta.parentKey!) : undefined
          );
        }
      } else {
        // is meta.json
        hasMetadata = true;
        this.parseMetadataFile(
          unzipped,
          itemKey,
          parentPath,
          items,
          metaMap,
          errors
        );
      }

      if (closestParent === this.zipRoot && items.has(itemKey)) {
        firstLevel.push(items.get(itemKey)!);
      }

      if (!opts.ignoreMetadata && level < lastLevel) {
        this.checkErrors(errors, lastDirectory, items, levelMap, metaMap);
        levelMap.delete(lastDirectory);
      }

      lastDirectory = parentPath;
      lastLevel = level;
    });

    if (!opts.ignoreMetadata) {
      [...levelMap.keys()].reverse().forEach(level => {
        this.checkErrors(errors, level, items, levelMap, metaMap);
      });
    }

    const finalItems = [...items.values()];

    const hasOneFolder =
      firstLevel.length === 1 &&
      firstLevel[0].type === CollectionItemType.folder;

    const hasNotebooks =
      finalItems.find(i => i.type === CollectionItemType.notebook) !==
      undefined;

    console.debug('errors', errors);
    return {
      zipName: finalZipName,
      items: finalItems,
      hasOneFolder,
      hasNotebooks,
      hasMetadata,
      rootMeta: metaMap.get(''),
      errors
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
    update.updatedAt = Date.now();
    if (newItem) {
      if (newItem.tags) {
        update.tags = newItem.tags;
        update.tags_meta = newItem.tags_meta;
      }
      if (newItem.content) {
        update.content = newItem.content;
        update.content_meta = newItem.content_meta;
      }
      if (newItem.order) {
        update.order = newItem.order;
        update.order_meta = newItem.order_meta;
      }
      if (isParent(newItem.type) && newItem.settings?.sort) {
        if (!update.settings) {
          update.settings = { sort: newItem.settings.sort };
        } else {
          update.settings.sort = newItem.settings.sort;
        }
        update.settings_meta = newItem.settings_meta;
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
      if (!duplicatesMap.has(item.parentId)) {
        const siblings = newItems.filter(
          item => item.parentId === item.parentId
        );
        const duplicates = this.findDuplicates(item.parentId, siblings);
        duplicatesMap.set(item.parentId, duplicates);
      }
      const newDuplicates = duplicatesMap.get(item.parentId)!;

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
          .filter(newItem => newItem.parentId === item.id)
          .forEach(newItem => (newItem.parentId = dupl.id));
      }
    }
  }

  private mergeZipItemsWithOptions(
    items: CollectionItem[],
    parent: string,
    options: ZipMergeOptions
  ) {
    const firstLevelItems = items.filter(item => item.parentId === parent);
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
          .filter(item => item.parentId === parent)
          .map(item => ({ ...item, status: 'merged' }) as ZipMergeFistLevel),
        ...newItems
          .filter(item => item.parentId === parent)
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
    const firstLayer = items.filter(item => item.parentId === parent);
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
      .filter(item => item.parentId === firstLayer[0].id)
      .forEach(item => (item.parentId = parent));
  }

  private createNewParent(
    type: CollectionItemTypeValues,
    items: CollectionItem[],
    parent: string,
    zipName: string,
    options: ZipMergeOptions,
    rootMeta?: ZipParsedMetadata
  ) {
    const firstLayer = items.filter(item => item.parentId === parent);
    const { item, id } =
      type === CollectionItemType.folder
        ? collectionService.getNewFolderObj(parent)
        : notebooksService.getNewNotebookObj(parent);
    item.title = '';
    if (rootMeta) {
      this.fillInMeta(item, rootMeta, undefined, true);
    }
    if (options.newFolderName || item.title === '') {
      item.title = options.newFolderName || zipName;
    }
    items.unshift({ ...item, id });
    firstLayer.forEach(item => (item.parentId = id));
    return id;
  }

  public mergeZipItems(
    parent: string,
    zipData: ZipParsedData,
    opts: ZipMergeOptions
  ): ZipMergeResult | null {
    opts = { ...this.defaultOpts, ...opts };
    if (zipData.errors.length > 0) {
      return null;
    }

    const items = structuredClone(zipData.items);

    // zipRoot is a fake temporary parent, replace
    items
      .filter(i => i.parentId === this.zipRoot)
      .forEach(i => (i.parentId = parent));

    if (opts.removeNotebooks) {
      items
        .filter(i => i.type === CollectionItemType.notebook)
        .forEach(i => (i.type = CollectionItemType.folder));
    }

    if (
      opts.removeFirstFolder === true &&
      !opts.createNotebook &&
      zipData.hasOneFolder
    ) {
      this.removeFirstFolder(items, parent);
    }

    if (opts.createNewFolder === true && !opts.createNotebook) {
      this.createNewParent(
        CollectionItemType.folder,
        items,
        parent,
        zipData.zipName,
        opts,
        zipData.rootMeta
      );
    }

    if (opts.createNotebook === true) {
      this.createNewParent(
        CollectionItemType.notebook,
        items,
        parent,
        zipData.zipName,
        opts,
        zipData.rootMeta
      );
    }

    return this.mergeZipItemsWithOptions(items, parent, opts);
  }

  public commitMergeResult(zipMerge: ZipMergeResult) {
    // TODO re-enable transactions
    // remove the table from all queries as a start
    // space.transaction(() => {
    const allDocIds = [
      ...collectionService.saveItems(zipMerge.newItems, true),
      ...collectionService.saveItems(zipMerge.updatedItems, true)
    ];
    allDocIds.forEach(docId => historyService.addVersion(docId, true));
    // });
  }

  public commitDocument(
    lexical: SerializedEditorState<SerializedLexicalNode>,
    parent: string,
    title: string,
    docId?: string
  ) {
    space.transaction(() => {
      // handle history as one bulk change here
      historyService.disableForBulk(() => {
        if (!docId) {
          docId = collectionService.addDocument(parent);
          collectionService.setItemTitle(docId, title);
        }
        collectionService.setItemLexicalContent(docId, lexical);
      });
    });
    if (docId) {
      historyService.addVersion(docId, true);
    }
    return docId;
  }

  public canRestoreSpace(zipData: ZipParsedData): boolean {
    if (zipData.errors.length > 0) {
      return false;
    }
    const firstLevel = zipData.items.filter(i => i.parentId === this.zipRoot);
    return !firstLevel.find(
      i =>
        i.type !== CollectionItemType.folder &&
        i.type !== CollectionItemType.notebook
    );
  }

  public restoreSpace(zipData: ZipParsedData): boolean {
    if (zipData.errors.length > 0) {
      return false;
    }
    const firstLevel = zipData.items.filter(i => i.parentId === this.zipRoot);
    // if docs at root, stop / error
    const canRestoreSpace = !firstLevel.find(
      i =>
        i.type !== CollectionItemType.folder &&
        i.type !== CollectionItemType.notebook
    );
    if (!canRestoreSpace) {
      return false;
    }
    // force type notebook in first level folders
    firstLevel.forEach(i => (i.type = CollectionItemType.notebook));

    // sort by created date if metadata present
    firstLevel.sort((i1, i2) => i1.createdAt - i2.createdAt); // TODO adjust according to setting

    // save first notebook title to force merge with default notebook
    const firstNotebookTitle = firstLevel[0].title;
    const firstNotebookCreated = firstLevel[0].createdAt;

    storageService.nukeSpace();
    const notebook = notebooksService.getCurrentNotebook();
    firstLevel[0].title = collectionService.getItemTitle(notebook);

    const zipMerge = this.mergeZipItems(ROOT_COLLECTION, zipData, {
      overwrite: true
    })!;
    if (
      zipMerge.updatedItems.length < 1 &&
      zipMerge.updatedItems[0].type !== CollectionItemType.notebook
    ) {
      throw Error('something went wrong');
    }
    // restore first notebook title & creation date
    zipMerge.updatedItems[0].title = firstNotebookTitle;
    zipMerge.updatedItems[0].createdAt = firstNotebookCreated;

    this.commitMergeResult(zipMerge);
    return true;
  }
}

const importService = new ImportService();
export default importService;
