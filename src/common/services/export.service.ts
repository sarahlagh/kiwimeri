import {
  CollectionItem,
  CollectionItemType,
  CollectionItemTypeValues
} from '@/collection/collection';
import { ROOT_FOLDER } from '@/constants';
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

export type ZipMetadata = {
  format?: 'markdown';
  type?: CollectionItemTypeValues;
  files?: {
    [key: string]: Partial<
      Pick<CollectionItem, 'type' | 'title' | 'created' | 'updated' | 'tags'>
    >;
  };
};

class ExportService {
  private readonly opts: ZipExportOptions = {
    includeMetadata: true,
    inlinePages: true
  };

  private getDocumentContentFormatted(storedJson: string) {
    const content = storedJson.startsWith('{"root":{')
      ? storedJson
      : unminimizeContentFromStorage(storedJson);
    return formatterService.getMarkdownFromLexical(content);
  }

  private fillDirectoryStructure(
    id: string,
    fileTree: ZipFileTree,
    notebook: string,
    opts = this.opts
  ) {
    const meta = new Map<string, ZipMetadata>();
    const items = collectionService.getBrowsableCollectionItems(id, notebook);
    // create text files
    items
      .filter(item => item.type !== CollectionItemType.folder)
      .forEach((item, idx) => {
        let itemKey = `${item.title}.md`;
        if (fileTree[itemKey]) {
          itemKey = `${item.title} (${idx}).md`;
        }
        fileTree[itemKey] = [strToU8(this.getSingleDocumentContent(item.id))];

        if (opts.includeMetadata) {
          const metaId = `${notebook}-${item.parent}`;
          if (!meta.has(metaId)) {
            meta.set(metaId, {
              format: 'markdown',
              type: CollectionItemType.folder, // TODO handle notebook
              files: {}
            });
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
        const metaId = `${notebook}-${item.id}`;
        if (opts.includeMetadata && meta.has(metaId)) {
          fileTree['meta.json'] = [strToU8(JSON.stringify(meta.get(metaId)))];
        }
        let itemKey = item.title;
        if (fileTree[itemKey]) {
          itemKey = `${item.title} (${idx})`;
        }
        fileTree[itemKey] = {};
        this.fillDirectoryStructure(item.id, fileTree[itemKey], notebook);
      });

    const metaId = `${notebook}-${id}`;
    if (opts.includeMetadata && meta.has(metaId)) {
      fileTree['meta.json'] = [strToU8(JSON.stringify(meta.get(metaId)))];
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

  public getFolderContent(id: string, opts = this.opts) {
    const notebook = collectionService.getItemField<string>(id, 'notebook')!;
    return this.fillDirectoryStructure(id, {}, notebook, opts);
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
        opts
      );
    });
    return fileTree;
  }
}

export const exportService = new ExportService();
