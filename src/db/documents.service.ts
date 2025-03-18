import { Id } from 'tinybase/common/with-schemas';
import { useResultSortedRowIds, useTable } from 'tinybase/ui-react';
import { createQueries, Queries } from 'tinybase/with-schemas';
import { minimizeForStorage } from '../common/wysiwyg/conversion';
import { Document } from '../documents/document';
import storageService, { StoreType } from './storage.service';

export const initialContent = () => {
  // 'empty' editor
  return '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';
};

class DocumentsService {
  private readonly documentTable = 'documents';
  private readonly fetchAllDocumentsQuery = 'fetchAllDocuments';

  private queries: Queries<StoreType>;
  public constructor() {
    this.queries = createQueries(storageService.getStore());
    this.queries.setQueryDefinition(
      this.fetchAllDocumentsQuery,
      this.documentTable,
      ({ select }) => {
        select('title');
        select('content');
        select('created');
        select('updated');
      }
    );
  }

  public getQueries() {
    return this.queries;
  }

  public getDocuments(
    sortBy: 'created' | 'updated' = 'created',
    descending = false
  ) {
    return this.queries
      .getResultSortedRowIds(this.fetchAllDocumentsQuery, sortBy, descending)
      .map(rowId => {
        const row = this.queries.getResultRow(
          this.fetchAllDocumentsQuery,
          rowId
        );
        return { ...row, id: rowId } as Document;
      });
  }

  public useDocuments(
    sortBy: 'created' | 'updated' = 'created',
    descending = false
  ) {
    const table = useTable(this.documentTable);
    return useResultSortedRowIds(
      this.fetchAllDocumentsQuery,
      sortBy,
      descending
    ).map(rowId => {
      const row = table[rowId];
      return { ...row, id: rowId } as Document;
    });
  }

  public addDocument() {
    const now = Date.now();
    storageService.getStore().addRow(this.documentTable, {
      title: 'New document',
      content: initialContent(),
      created: now,
      updated: now
    });
  }

  public deleteDocument(rowId: Id) {
    return storageService.getStore().delRow(this.documentTable, rowId);
  }

  public documentExists(rowId: Id) {
    return storageService.getStore().hasRow(this.documentTable, rowId);
  }

  public getDocument(rowId: Id) {
    return storageService
      .getStore()
      .getRow(this.documentTable, rowId) as unknown as Document;
  }

  public getDocumentTitle(rowId: Id) {
    return (
      (storageService
        .getStore()
        .getCell(this.documentTable, rowId, 'title')
        ?.valueOf() as string) || null
    );
  }

  public setDocumentTitle(rowId: Id, title: string) {
    storageService
      .getStore()
      .setCell(this.documentTable, rowId, 'title', title);
    storageService
      .getStore()
      .setCell(this.documentTable, rowId, 'updated', Date.now());
  }

  public setDocumentContent(rowId: Id, content: string) {
    storageService
      .getStore()
      .setCell(this.documentTable, rowId, 'content', () =>
        minimizeForStorage(content)
      );
    storageService
      .getStore()
      .setCell(this.documentTable, rowId, 'updated', Date.now());
  }
}

const documentsService = new DocumentsService();
export default documentsService;
