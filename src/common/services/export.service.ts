import {
  CollectionItem,
  CollectionItemDisplayOpts,
  CollectionItemResult,
  CollectionItemType,
  CollectionItemTypeValues
} from '@/collection/collection';
import { getGlobalTrans } from '@/config';
import { META_JSON } from '@/constants';
import collectionService, {
  INITIAL_CONTENT_START
} from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import formatConverter from '@/format-conversion/format-converter.service';
import { strToU8, zip } from 'fflate';
import { unminimizeContentFromStorage } from '../wysiwyg/compress-file-content';

export type ZipFileTree = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

export type ZipExportOptions = {
  includeMetadata?: boolean;
  inlinePages?: boolean;
};

export type ZipMetadata = Partial<
  Pick<
    CollectionItem,
    'type' | 'title' | 'created' | 'updated' | 'tags' | 'order'
  >
> & {
  display_opts?: CollectionItemDisplayOpts;
  format?: 'markdown';
  files?: {
    [key: string]: ZipMetadata;
  };
};

class ExportService {
  private readonly opts: ZipExportOptions = {
    includeMetadata: true,
    inlinePages: true
  };
  private readonly maxLength = 50;

  private getDocumentContentFormatted(storedJson: string) {
    const content = storedJson.startsWith(INITIAL_CONTENT_START)
      ? storedJson
      : unminimizeContentFromStorage(storedJson);
    return formatConverter.toMarkdown(content);
  }

  private getParentMeta(
    id: string,
    type?: CollectionItemTypeValues,
    withFiles = false
  ): ZipMetadata {
    return {
      type,
      format: 'markdown',
      title:
        type !== CollectionItemType.page
          ? collectionService.getItemTitle(id)
          : undefined,
      tags: collectionService.getItemField(id, 'tags'),
      order: collectionService.getItemField(id, 'order'),
      display_opts: collectionService.getItemDisplayOpts(id),
      created: collectionService.getItemField(id, 'created'),
      updated: collectionService.getItemField(id, 'updated'),
      files: withFiles ? {} : undefined
    };
  }

  private getFileMeta(item: CollectionItemResult): ZipMetadata {
    return {
      type: item.type,
      created: item.created,
      updated: item.updated,
      tags: item.tags,
      title: item.title,
      order: item.order,
      display_opts: item.display_opts
        ? JSON.parse(item.display_opts)
        : undefined
    };
  }

  private fillDirectoryStructure(
    id: string,
    fileTree: ZipFileTree,
    opts: ZipExportOptions,
    folderType?: CollectionItemTypeValues
  ) {
    const meta = new Map<string, ZipMetadata>();
    const items = collectionService.getBrowsableCollectionItems(id);

    // create text files
    items
      .filter(item => item.type === CollectionItemType.document)
      .forEach((item, idx) => {
        const title = item.title.substring(0, this.maxLength);
        let itemKey = `${title}.md`;
        if (fileTree[itemKey]) {
          itemKey = `${title} (${idx}).md`;
        }
        const docResp = this.getSingleDocumentContent(item.id, opts);
        if (typeof docResp === 'string') {
          fileTree[itemKey] = [strToU8(docResp)];
          if (opts.includeMetadata) {
            const metaId = item.parent;
            if (!meta.has(metaId)) {
              meta.set(metaId, this.getParentMeta(id, folderType, true));
            }
            meta.get(metaId)!.files![itemKey] = this.getFileMeta(item);
          }
        } else {
          fileTree[`${itemKey}`] = docResp;
          itemKey = `${itemKey}/`;
        }
      });

    // create dirs
    items
      .filter(
        item =>
          item.type === CollectionItemType.folder ||
          item.type === CollectionItemType.notebook
      )
      .forEach((item, idx) => {
        let itemKey = item.title.substring(0, this.maxLength);
        if (fileTree[itemKey]) {
          itemKey = `${item.title} (${idx})`;
        }
        fileTree[itemKey] = {};
        this.fillDirectoryStructure(
          item.id,
          fileTree[itemKey],
          opts,
          CollectionItemType.folder
        );
      });

    const metaId = id;
    if (!meta.has(metaId)) {
      meta.set(metaId, this.getParentMeta(id, folderType));
    }

    if (opts.includeMetadata && meta.has(metaId)) {
      fileTree[META_JSON] = [
        // pretty print meta json
        strToU8(JSON.stringify(meta.get(metaId), null, 2))
      ];
    }

    return fileTree;
  }

  // TODO use fflate to stream zip
  public async toZip(
    fileTree: ZipFileTree
  ): Promise<Uint8Array<ArrayBufferLike>> {
    return new Promise((resolve, reject) => {
      zip(fileTree, { level: 0 }, (err, data) => {
        if (err) {
          console.error('error zipping data', err);
          return reject(err);
        }
        return resolve(data);
      });
    });
  }

  public getSingleDocumentContent(
    id: string,
    opts?: ZipExportOptions
  ): string | ZipFileTree {
    if (!opts) {
      opts = this.opts;
    } else {
      opts = { ...this.opts, ...opts };
    }
    const json = collectionService.getItemContent(id) || '';
    let content: string;
    content = this.getDocumentContentFormatted(json);
    const pages = collectionService.getDocumentPages(id);

    // if inline pages, add content as string
    if (opts.inlinePages) {
      pages.forEach(page => {
        content += formatConverter.getPagesSeparator();
        content += this.getDocumentContentFormatted(
          collectionService.getItemContent(page.id) || ''
        );
      });
    } else if (pages.length > 0) {
      // if not inline pages and has pages, create dir structure
      const docTitle =
        collectionService.getItemTitle(id) || getGlobalTrans().newDocTitle;
      const itemKey = `${docTitle} 0.md`;
      const fileTree: ZipFileTree = {};
      fileTree[itemKey] = [strToU8(content)];
      const meta: ZipMetadata = {
        type: CollectionItemType.document,
        files: {}
      };
      meta.files![itemKey] = this.getParentMeta(
        id,
        CollectionItemType.document,
        false
      );
      pages.forEach((page, idx) => {
        const pageContent = this.getDocumentContentFormatted(
          collectionService.getItemContent(page.id) || ''
        );
        const pageKey = `${docTitle} ${idx + 1}.md`;
        fileTree[pageKey] = [strToU8(pageContent)];
        meta.files![pageKey] = this.getParentMeta(
          page.id,
          CollectionItemType.page,
          false
        );
      });
      if (opts.includeMetadata) {
        fileTree[META_JSON] = [
          // pretty print meta json
          strToU8(JSON.stringify(meta, null, 2))
        ];
      }
      return fileTree;
    }
    return content;
  }

  public getFolderContent(id: string, opts?: ZipExportOptions) {
    if (!opts) {
      opts = this.opts;
    } else {
      opts = { ...this.opts, ...opts };
    }
    return this.fillDirectoryStructure(id, {}, opts);
  }

  public getSpaceContent(opts?: ZipExportOptions) {
    if (!opts) {
      opts = this.opts;
    } else {
      opts = { ...this.opts, ...opts };
    }
    const fileTree: ZipFileTree = {};
    const notebooks = notebooksService.getNotebooks();
    notebooks.forEach((notebook, idx) => {
      let key = notebook.title;
      if (fileTree[key]) {
        key = `${notebook.title} (${idx})`;
      }
      fileTree[key] = this.fillDirectoryStructure(notebook.id, {}, opts);
    });
    return fileTree;
  }
}

export const exportService = new ExportService();
