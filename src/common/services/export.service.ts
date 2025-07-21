import {
  CollectionItem,
  CollectionItemType,
  CollectionItemTypeValues
} from '@/collection/collection';
import { META_JSON, ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import formatterService from '@/format-conversion/formatter.service';
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
  Pick<CollectionItem, 'type' | 'title' | 'created' | 'updated' | 'tags'>
> & {
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
    const content = storedJson.startsWith('{"root":{')
      ? storedJson
      : unminimizeContentFromStorage(storedJson);
    return formatterService.getMarkdownFromLexical(content);
  }

  private getMetaObj(
    id: string,
    folderType: CollectionItemTypeValues,
    notebook: string,
    withFiles = false
  ): ZipMetadata {
    return {
      type: folderType,
      format: 'markdown',
      title: collectionService.getItemTitle(id === ROOT_FOLDER ? notebook : id),
      tags: collectionService.getItemField(id, 'tags'),
      created: collectionService.getItemField(id, 'created'),
      updated: collectionService.getItemField(id, 'updated'),
      files: withFiles ? {} : undefined
    };
  }

  private fillDirectoryStructure(
    id: string,
    fileTree: ZipFileTree,
    notebook: string,
    folderType: CollectionItemType.folder | CollectionItemType.notebook,
    opts = this.opts
  ) {
    const meta = new Map<string, ZipMetadata>();
    const items = collectionService.getBrowsableCollectionItems(id, notebook);

    // create text files
    items
      .filter(item => item.type !== CollectionItemType.folder)
      .forEach((item, idx) => {
        const title = item.title.substring(0, this.maxLength);
        let itemKey = `${title}.md`;
        if (fileTree[itemKey]) {
          itemKey = `${title} (${idx}).md`;
        }
        fileTree[itemKey] = [strToU8(this.getSingleDocumentContent(item.id))];

        if (opts.includeMetadata) {
          const metaId = `${notebook}-${item.parent}`;
          if (!meta.has(metaId)) {
            meta.set(metaId, this.getMetaObj(id, folderType, notebook, true));
          }
          meta.get(metaId)!.files![itemKey] = {
            type: item.type,
            created: item.created,
            updated: item.updated,
            tags: item.tags,
            title: item.title
          };
        }
      });

    // create dirs
    items
      .filter(item => item.type === CollectionItemType.folder)
      .forEach((item, idx) => {
        let itemKey = item.title.substring(0, this.maxLength);
        if (fileTree[itemKey]) {
          itemKey = `${item.title} (${idx})`;
        }
        fileTree[itemKey] = {};
        this.fillDirectoryStructure(
          item.id,
          fileTree[itemKey],
          notebook,
          CollectionItemType.folder,
          opts
        );
      });

    const metaId = `${notebook}-${id}`;
    if (!meta.has(metaId)) {
      meta.set(metaId, this.getMetaObj(id, folderType, notebook));
    }

    if (opts.includeMetadata && meta.has(metaId)) {
      fileTree[META_JSON] = [strToU8(JSON.stringify(meta.get(metaId)))];
    }

    return fileTree;
  }

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
    opts: Pick<ZipExportOptions, 'inlinePages'> = this.opts
  ) {
    const json = collectionService.getItemContent(id) || '';
    let content: string;
    content = this.getDocumentContentFormatted(json);
    if (opts.inlinePages !== false) {
      const pages = collectionService.getDocumentPages(id);
      pages.forEach(page => {
        content += formatterService.getPagesSeparator();
        content += this.getDocumentContentFormatted(
          collectionService.getItemContent(page.id) || ''
        );
      });
    }
    return content;
  }

  public getFolderContent(id: string, opts = this.opts, notebook?: string) {
    if (!notebook) {
      notebook =
        id !== ROOT_FOLDER
          ? collectionService.getItemField<string>(id, 'notebook')!
          : notebooksService.getCurrentNotebook();
    }
    return this.fillDirectoryStructure(
      id,
      {},
      notebook,
      id === ROOT_FOLDER
        ? CollectionItemType.notebook
        : CollectionItemType.folder,
      opts
    );
  }

  public getSpaceContent(opts = this.opts) {
    const fileTree: ZipFileTree = {};
    const notebooks = notebooksService.getNotebooks();
    notebooks.forEach((notebook, idx) => {
      let key = notebook.title;
      if (fileTree[key]) {
        key = `${notebook.title} (${idx})`;
      }
      fileTree[key] = this.fillDirectoryStructure(
        ROOT_FOLDER,
        {},
        notebook.id,
        CollectionItemType.notebook,
        opts
      );
    });
    return fileTree;
  }
}

export const exportService = new ExportService();
