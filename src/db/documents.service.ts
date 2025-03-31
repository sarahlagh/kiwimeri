import { Id } from 'tinybase/common/with-schemas';
import { useCell, useResultSortedRowIds, useTable } from 'tinybase/ui-react';
import { createQueries, Queries } from 'tinybase/with-schemas';
import { ROOT_FOLDER } from '../constants';
import { DocumentNodeResult, DocumentNodeType } from '../documents/document';
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

  public generateFetchAllDocumentNodesQuery(
    parent: string,
    deleted: boolean = false
  ) {
    const queryId = this.queries.getQueryIds().find(id => id === parent);
    const queryName = `fetchAllDocumentNodesFor${parent}`;
    if (!queryId && parent !== '-1') {
      this.queries.setQueryDefinition(
        queryName,
        this.documentTable,
        ({ select, where }) => {
          select('title');
          select('type');
          select('created');
          select('updated');
          where('parent', parent);
          where('deleted', deleted);
        }
      );
    }
    return queryName;
  }

  public useDocumentNodes(
    parent: string,
    sortBy: 'created' | 'updated' = 'created',
    descending = false
  ): DocumentNodeResult[] {
    const table = useTable(this.documentTable);
    const queryName = `fetchAllDocumentNodesFor${parent}`;
    return useResultSortedRowIds(queryName, sortBy, descending).map(rowId => {
      const row = table[rowId];
      return { ...row, id: rowId } as DocumentNodeResult;
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
    this.updateParentUpdatedRecursive(parent);
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
    this.updateParentUpdatedRecursive(this.getDocumentNodeParent(rowId));
    return storageService.getStore().delRow(this.documentTable, rowId);
  }

  public documentNodeExists(rowId: Id) {
    return storageService.getStore().hasRow(this.documentTable, rowId);
  }

  public getDocumentNodeParent(rowId: Id) {
    return (
      (storageService
        .getStore()
        .getCell(this.documentTable, rowId, 'parent')
        ?.valueOf() as string) || ROOT_FOLDER
    );
  }

  public setDocumentNodeParent(rowId: Id, parentId: Id) {
    storageService
      .getStore()
      .setCell(this.documentTable, rowId, 'parent', parentId);
    this.updateParentUpdatedRecursive(this.getDocumentNodeParent(rowId));
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
    this.updateParentUpdatedRecursive(this.getDocumentNodeParent(rowId));
  }

  public getDocumentNodeContent(rowId: Id) {
    return (
      (storageService
        .getStore()
        .getCell(this.documentTable, rowId, 'content')
        ?.valueOf() as string) || null
    );
  }

  public useDocumentNodeContent(rowId: Id) {
    return (
      (useCell(this.documentTable, rowId, 'content')?.valueOf() as string) ||
      null
    );
  }

  public setDocumentContent(rowId: Id, content: string) {
    storageService
      .getStore()
      .setCell(this.documentTable, rowId, 'content', () => content);
    storageService
      .getStore()
      .setCell(this.documentTable, rowId, 'updated', Date.now());
    this.updateParentUpdatedRecursive(this.getDocumentNodeParent(rowId));
  }

  public getDocumentType(rowId: Id) {
    return (
      (storageService
        .getStore()
        .getCell(this.documentTable, rowId, 'type')
        ?.valueOf() as string) || null
    );
  }

  private updateParentUpdatedRecursive(folder: string) {
    if (folder === ROOT_FOLDER) {
      return;
    }
    storageService
      .getStore()
      .setCell(this.documentTable, folder, 'updated', Date.now());
    this.updateParentUpdatedRecursive(this.getDocumentNodeParent(folder));
  }
}

const documentsService = new DocumentsService();
export default documentsService;
