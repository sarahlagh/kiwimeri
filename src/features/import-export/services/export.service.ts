import {
  CollectionItemResult,
  CollectionItemType,
  CollectionItemTypeValues
} from '@/collection/collection';
import { unminimizeContentFromStorage } from '@/common/wysiwyg/compress-file-content';
import { META_JSON } from '@/constants';
import collectionService, {
  INITIAL_CONTENT_START
} from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import formatConverter from '@/format-conversion/format-converter.service';
import { strToU8, zip } from 'fflate';
import {
  ZipExportOptions,
  ZipFileTree,
  ZipMetadata
} from '../model/model-export';

class ExportService {
  private readonly opts: ZipExportOptions = {
    includeMetadata: true
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
    const item = collectionService.getItem(id);
    return {
      type,
      format: 'markdown',
      title: item.title,
      tags: item.tags,
      order: item.order,
      settings: item.settings?.sort ? { sort: item.settings.sort } : undefined,
      created: item.created,
      updated: item.updated,
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
      order: item.order
    };
  }

  private fillDirectoryStructure(
    folderId: string,
    fileTree: ZipFileTree,
    opts: ZipExportOptions,
    folderType?: CollectionItemTypeValues
  ) {
    const meta = new Map<string, ZipMetadata>();
    const items = collectionService.getBrowsableCollectionItems(folderId);

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
        fileTree[itemKey] = [strToU8(docResp)];
        if (opts.includeMetadata) {
          const metaId = item.parent;
          if (!meta.has(metaId)) {
            meta.set(metaId, this.getParentMeta(folderId, folderType, true));
          }
          meta.get(metaId)!.files![itemKey] = this.getFileMeta(item);
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

    const metaId = folderId;
    if (!meta.has(metaId)) {
      meta.set(metaId, this.getParentMeta(folderId, folderType));
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

  public getSingleDocumentContent(id: string, opts?: ZipExportOptions): string {
    if (!opts) {
      opts = this.opts;
    } else {
      opts = { ...this.opts, ...opts };
    }
    const json = collectionService.getItemContent(id) || '';
    return this.getDocumentContentFormatted(json);
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

const exportService = new ExportService();
export default exportService;
