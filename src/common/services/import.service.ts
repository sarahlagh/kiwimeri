import {
  CollectionItem,
  CollectionItemFieldEnum,
  CollectionItemResult,
  CollectionItemType,
  CollectionItemTypeValues,
  CollectionItemUpdatableFields,
  CollectionItemUpdate,
  setFieldMeta
} from '@/collection/collection';
import { META_JSON, ROOT_COLLECTION } from '@/constants';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import storageService from '@/db/storage.service';
import tagsService from '@/db/tags.service';
import formatterService from '@/format-conversion/formatter.service';
import { Unzipped, strFromU8, unzip } from 'fflate';
import { SerializedEditorState, SerializedLexicalNode } from 'lexical';
import * as z from 'zod';
import { ZipMetadata } from './export.service';

export type ZipMergeFistLevel = {
  status: 'new' | 'merged';
} & Pick<CollectionItem, 'id' | 'title' | 'type' | 'created' | 'updated'>;

export type ZipParseError = {
  family: 'incorrect_meta' | 'parse_error';
  code?:
    | 'incorrect_child_type'
    | 'incorrect_parent_type'
    | 'malformed_document'
    | 'page_has_inline_items'
    | 'orphaned_page'
    | 'orphaned_folder'
    | 'orphaned_notebook';
  path: string;
};

export type ZipParsedData = {
  zipName: string;
  items: CollectionItem[];
  hasOneFolder: boolean;
  hasMetadata: boolean;
  rootMeta?: ZipParsedMetadata;
  errors: ZipParseError[];
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

type ZipParsedMetadata = {
  parentKey?: string;
  orphans?: string[];
  hasInlinePages?: boolean;
  files?: {
    [key: string]: ZipParsedMetadata;
  };
} & ZipMetadata;

const ZipMetadataSchema = z.object({
  format: z.enum(['markdown']).optional(),
  type: z.enum(CollectionItemType).optional(),
  title: z.string().optional(),
  created: z.number().optional(),
  updated: z.number().optional(),
  tags: z.string().optional(),
  files: z.object().optional()
});

class ImportService {
  private readonly zipRoot = 'zip-root';
  private readonly defaultOpts: ZipImportOptions & ZipMergeCommitOptions = {
    // parse opts
    ignoreMetadata: false,
    detectInlinedPages: true,
    titleRemoveDuplicateIdentifiers: true,
    titleRemoveExtension: true,
    // merge opts
    createNotebook: false,
    overwrite: false,
    createNewFolder: false,
    removeFirstFolder: false,
    // commit opts
    deleteExistingPages: true
  };

  public parseNonLexicalContent(content: string, opts?: ZipParseOptions) {
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
      const { obj: lexical, errors } =
        formatterService.getLexicalFromMarkdown(doc);
      if (errors?.length || 0 > 0) {
        return { errors };
      }
      const pages: SerializedEditorState<SerializedLexicalNode>[] = [];
      pagesFormatted.forEach(page => {
        const { obj: pageLexical, errors } =
          formatterService.getLexicalFromMarkdown(page);
        if (errors?.length || 0 > 0) {
          return { errors };
        }
        pages.push(pageLexical!);
      });
      return { doc: lexical, pages };
    }
    const { obj, errors } = formatterService.getLexicalFromMarkdown(content);
    if (errors?.length || 0 > 0) {
      return { errors };
    }
    return { doc: obj, pages: [] };
  }

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
      item.parent = parentItem.id!;
    }
    if (meta.title) {
      item.title = item.type === CollectionItemType.page ? '' : meta.title;
    }
    if (meta.created) {
      item.created = meta.created;
    }
    if (meta.updated) {
      item.updated = meta.updated;
      // all the _meta too,
      CollectionItemUpdatableFields.forEach(field => {
        const metaField = `${field}_meta` as CollectionItemFieldEnum;
        if (item[field]) {
          item[metaField] = setFieldMeta(
            `${item[field]}`,
            item.updated
          ) as never;
        }
      });
    }
    if (meta.tags) {
      item.tags = item.type === CollectionItemType.page ? '' : meta.tags;
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
    let fKey = itemKey;
    const item = items.get(itemKey)!;
    try {
      const content = strFromU8(unzipped[itemKey]);
      const {
        doc,
        pages,
        errors: parseErrors
      } = this.parseNonLexicalContent(content, opts);
      if (parseErrors?.length || 0 > 0) {
        console.error(parseErrors);
        errors.push({
          family: 'parse_error',
          path: fKey
        });
        return false;
      }
      collectionService.setUnsavedItemLexicalContent(item, doc!);
      pages!.forEach((page, idx) => {
        const { item: pItem, id: pId } = collectionService.getNewPageObj(
          item.id!
        );
        fKey = `${itemKey}/${idx + 1}`;
        const pageItem = {
          ...pItem,
          id: pId,
          title: '',
          title_meta: ''
        };
        items.set(fKey, pageItem);
        collectionService.setUnsavedItemLexicalContent(pageItem, page);
      });
      return pages!.length > 0;
    } catch (e) {
      console.error(e);
      errors.push({
        family: 'parse_error',
        path: fKey
      });
    }
    return false;
  }

  private goUpOneFolder(path: string) {
    const tempNames = path.replace(/\/$/, '').split('/');
    tempNames.pop();
    return tempNames.join('/') + '/';
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
      const origMeta: ZipMetadata = JSON.parse(strFromU8(unzipped[itemKey]));
      // use zod to validate schema
      ZipMetadataSchema.parse(origMeta);
      const meta: ZipParsedMetadata = {
        parentKey: parentPath,
        ...origMeta
      };
      metaMap.set(parentPath, meta);
      // should always get the parent item before its meta unless its root
      let finalParentPath = parentPath;
      let parentIsDocument = false;
      // fill in meta for closestParent
      if (items.has(parentPath)) {
        const typeBefore = items.get(parentPath)!.type;
        this.fillInMeta(items.get(parentPath)!, meta);
        // if document with non inline pages detected...
        if (
          typeBefore === CollectionItemType.folder &&
          items.get(parentPath)!.type === CollectionItemType.document
        ) {
          parentIsDocument = true;
          // update the children parent - go up one folder
          finalParentPath = this.goUpOneFolder(finalParentPath);
          // delete the item created for the directory
          items.delete(parentPath);
        }
      }
      // fill in meta for siblings
      if (meta.files) {
        let docPath: string | undefined;
        const docTags = new Set<string>();
        const orphanPages: string[] = [];
        Object.keys(meta.files).forEach(filename => {
          let parentKey: string | undefined = undefined;
          let metaFile = meta.files![filename];
          const metaFilePath = `${parentPath}${filename}`;
          const oldMeta = metaMap.get(metaFilePath); // can happen with docs with inlined pages
          metaFile = { ...oldMeta, ...metaFile };
          if (items.has(metaFilePath)) {
            const item = items.get(metaFilePath)!;
            this.fillInMeta(item, metaFile);
          }
          // if document update its parent
          if (metaFile.type === CollectionItemType.document) {
            parentKey = finalParentPath;
            docPath = metaFilePath;
            if (items.has(metaFilePath) && items.get(parentKey)?.id) {
              items.get(metaFilePath)!.parent = items.get(parentKey)!.id!;
            }
            if (metaFile.tags) {
              metaFile.tags.split(',').forEach(tag => {
                docTags.add(tag);
              });
            }
          } else if (metaFile.type === CollectionItemType.page) {
            // if page update its parent to document
            if (docPath) {
              parentKey = docPath;
              if (items.has(metaFilePath) && items.get(parentKey)?.id) {
                items.get(metaFilePath)!.parent = items.get(parentKey)!.id!;
                // update doc tags
                if (metaFile.tags) {
                  metaFile.tags.split(',').forEach(tag => {
                    docTags.add(tag);
                  });
                }
              } else {
                // is a page, but document is still unknown
                orphanPages.push(metaFilePath);
              }
            } else {
              // is a page, but document is still unknown
              orphanPages.push(metaFilePath);
            }
          }
          metaMap.set(metaFilePath, { parentKey, ...metaFile });
        });
        if (docPath && metaMap.has(docPath)) {
          metaMap.get(docPath)!.orphans = [...orphanPages];
          orphanPages.forEach(pageKey => {
            metaMap.get(pageKey)!.parentKey = docPath;
            // update parent tags
            if (metaMap.get(pageKey)?.tags) {
              metaMap
                .get(pageKey)!
                .tags!.split(',')
                .forEach(tag => {
                  docTags.add(tag);
                });
            }
          });
          if (parentIsDocument) {
            metaMap.get(docPath)!.tags = [...docTags].join(',');
            if (items.get(docPath)) {
              items.get(docPath)!.tags = metaMap.get(docPath)!.tags;
            }
          }
        }
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

    let nbDocs = 0;
    let nbPages = 0;
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
        if (childType === CollectionItemType.document) {
          nbDocs++;
        } else if (childType === CollectionItemType.page) {
          nbPages++;
          if (childItem?.parent === this.zipRoot) {
            return errors.push({
              family: 'incorrect_meta',
              code: 'malformed_document',
              path: metaFilePath
            });
          }
        }
        if (
          childType === CollectionItemType.folder ||
          childType === CollectionItemType.notebook
        ) {
          return errors.push({
            family: 'incorrect_meta',
            code: 'incorrect_child_type',
            path: metaFilePath
          });
        }
        if (
          childType === CollectionItemType.page &&
          parentType !== CollectionItemType.document
        ) {
          return errors.push({
            family: 'incorrect_meta',
            code: 'orphaned_page',
            path: metaFilePath
          });
        }
        const hasInlinePages = childMeta?.hasInlinePages;
        if (hasInlinePages && childType !== CollectionItemType.document) {
          return errors.push({
            path: child,
            family: 'incorrect_meta',
            code: 'page_has_inline_items'
          });
        }
      } else {
        // if is directory in zip
        const childMetaFilePath = childMeta ? `${child}${META_JSON}` : child;

        if (childType === CollectionItemType.page) {
          return errors.push({
            family: 'incorrect_meta',
            code: 'incorrect_parent_type',
            path: childMetaFilePath
          });
        }
        if (
          childType === CollectionItemType.folder &&
          parentType !== CollectionItemType.folder &&
          parentType !== CollectionItemType.notebook
        ) {
          return errors.push({
            family: 'incorrect_meta',
            code: 'orphaned_folder',
            path: childMetaFilePath
          });
        }
        if (
          childType === CollectionItemType.notebook &&
          parentType !== CollectionItemType.notebook &&
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

    if (
      parentType === CollectionItemType.document &&
      (nbDocs !== 1 || nbDocs + nbPages !== level.length - 1) // -1 for the meta.json
    ) {
      return errors.push({
        family: 'incorrect_meta',
        code: 'malformed_document',
        path: metaFilePath
      });
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
      levelMap.get(parentPath)!.push(itemKey);

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
        const hasInlinePages = this.parseItemContent(
          unzipped,
          itemKey,
          items,
          errors,
          opts
        );

        if (hasInlinePages && !opts.ignoreMetadata && !metaMap.has(itemKey)) {
          metaMap.set(itemKey, { hasInlinePages });
        }

        if (!opts.ignoreMetadata && metaMap.has(itemKey)) {
          const meta = metaMap.get(itemKey)!;
          meta.hasInlinePages = hasInlinePages;
          this.fillInMeta(
            item,
            meta,
            meta.parentKey ? items.get(meta.parentKey!) : undefined
          );
          if (meta.orphans && meta.orphans.length > 0) {
            meta.orphans.forEach(orphan => {
              if (items.has(orphan)) {
                items.get(orphan)!.parent = item.id!;
              }
            });
          }
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

    console.debug('errors', errors);
    return {
      zipName: finalZipName,
      items: finalItems,
      hasOneFolder,
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
    rootMeta?: ZipParsedMetadata
  ) {
    const firstLayer = items.filter(item => item.parent === parent);
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
    firstLayer.forEach(item => (item.parent = id));
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
      .filter(i => i.parent === this.zipRoot)
      .forEach(i => (i.parent = parent));

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
    tagsService.reBuildTags();
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

  public canRestoreSpace(zipData: ZipParsedData): boolean {
    if (zipData.errors.length > 0) {
      return false;
    }
    const firstLevel = zipData.items.filter(i => i.parent === this.zipRoot);
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
    const firstLevel = zipData.items.filter(i => i.parent === this.zipRoot);
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
    firstLevel.sort((i1, i2) => i1.created - i2.created); // TODO adjust according to setting

    // save first notebook title to force merge with default notebook
    const firstNotebookTitle = firstLevel[0].title;
    const firstNotebookCreated = firstLevel[0].created;

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
    zipMerge.updatedItems[0].created = firstNotebookCreated;

    this.commitMergeResult(zipMerge, { deleteExistingPages: false });
    return true;
  }
}

export const importService = new ImportService();
