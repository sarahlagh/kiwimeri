import { Id } from 'tinybase/common/with-schemas';
import {
  useCell,
  useResultSortedRowIds,
  useRow,
  useTable
} from 'tinybase/ui-react';
import { createQueries, Queries } from 'tinybase/with-schemas';
import { minimizeForStorage } from '../common/wysiwyg/compress-storage';
import { ROOT_FOLDER } from '../constants';
import { DocumentNode, DocumentNodeType } from '../documents/document';
import storageService, { StoreType } from './storage.service';

export const initialContent = () => {
  // 'empty' editor
  return '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';
};

class DocumentsService {
  private readonly documentTable = 'documents';

  private queries: Queries<StoreType>;
  public constructor() {
    this.queries = createQueries(storageService.getStore());
  }

  public getQueries() {
    return this.queries;
  }

  public generateFetchAllDocumentNodesQuery(parent: string) {
    const queryId = this.queries.getQueryIds().find(id => id === parent);
    const queryName = `fetchAllDocumentNodesFor${parent}`;
    if (!queryId) {
      this.queries.setQueryDefinition(
        queryName,
        this.documentTable,
        ({ select, where }) => {
          select('title');
          select('parent');
          select('type');
          select('content');
          select('created');
          select('updated');
          where('parent', parent);
        }
      );
    }
    return queryName;
  }

  public useDocumentNodes(
    parent: string,
    sortBy: 'created' | 'updated' = 'created',
    descending = false
  ) {
    const table = useTable(this.documentTable);
    const queryName = `fetchAllDocumentNodesFor${parent}`;
    return useResultSortedRowIds(queryName, sortBy, descending).map(rowId => {
      const row = table[rowId];
      return { ...row, id: rowId } as DocumentNode;
    });
  }

  public addDocument(parent: string) {
    const now = Date.now();
    storageService.getStore().addRow(this.documentTable, {
      title: 'New document', // TODO translate
      parent: parent,
      content: initialContent(),
      created: now,
      updated: now,
      type: DocumentNodeType.document,
      deleted: false
    });
    this.updateParentRecursive(parent);
  }

  public addFolder(parent: string) {
    const now = Date.now();
    storageService.getStore().addRow(this.documentTable, {
      title: 'New folder', // TODO translate,
      parent: parent,
      created: now,
      updated: now,
      type: DocumentNodeType.folder,
      deleted: false
    });
  }

  public deleteNodeDocument(rowId: Id) {
    this.updateParentRecursive(this.getDocumentNode(rowId).parent);
    return storageService.getStore().delRow(this.documentTable, rowId);
  }

  public documentNodeExists(rowId: Id) {
    return storageService.getStore().hasRow(this.documentTable, rowId);
  }

  public getDocumentNode(rowId: Id) {
    return storageService
      .getStore()
      .getRow(this.documentTable, rowId) as unknown as DocumentNode;
  }

  public useDocumentNode(rowId: Id) {
    return useRow(this.documentTable, rowId) as unknown as DocumentNode;
  }

  public useDocumentNodeTitle(rowId: Id) {
    return (
      (useCell(this.documentTable, rowId, 'title')?.valueOf() as string) || null
    );
  }

  public getDocumentNodeTitle(rowId: Id) {
    return (
      (storageService
        .getStore()
        .getCell(this.documentTable, rowId, 'title')
        ?.valueOf() as string) || null
    );
  }

  public setDocumentNodeTitle(rowId: Id, title: string) {
    storageService
      .getStore()
      .setCell(this.documentTable, rowId, 'title', title);
    storageService
      .getStore()
      .setCell(this.documentTable, rowId, 'updated', Date.now());
    this.updateParentRecursive(this.getDocumentNode(rowId).parent);
  }

  public setDocumentContent(rowId: Id, content: string) {
    const minimized = minimizeForStorage(content);
    storageService
      .getStore()
      .setCell(this.documentTable, rowId, 'content', () => minimized);
    storageService
      .getStore()
      .setCell(this.documentTable, rowId, 'updated', Date.now());
    this.updateParentRecursive(this.getDocumentNode(rowId).parent);
  }

  private updateParentRecursive(folder: string) {
    if (folder === ROOT_FOLDER) {
      return;
    }
    storageService
      .getStore()
      .setCell(this.documentTable, folder, 'updated', Date.now());
    this.updateParentRecursive(this.getDocumentNode(folder).parent);
  }
}

const documentsService = new DocumentsService();
export default documentsService;
