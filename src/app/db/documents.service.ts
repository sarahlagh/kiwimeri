import { Id } from 'tinybase/common/with-schemas';
import { useTable } from 'tinybase/ui-react';
import { Note } from '../../notes/note';
import storageService from './storage.service';

class DocumentsService {
  private readonly documentTable = 'documents';

  public getDocuments() {
    const table = storageService.getStore().getTable(this.documentTable);
    return Object.keys(table).map(
      docId =>
        ({
          id: docId,
          title: table[docId].title,
          content: table[docId].content
        }) as Note
    );
  }

  public useDocuments() {
    const table = useTable(this.documentTable);
    return Object.keys(table).map(
      docId =>
        ({
          id: docId,
          title: table[docId].title,
          content: table[docId].content
        }) as Note
    );
  }

  public addDocument() {
    storageService.getStore().addRow(this.documentTable, {
      title: 'New Note',
      content: 'This is your note content'
    });
  }

  public deleteDocument(rowId: Id) {
    return storageService.getStore().delRow(this.documentTable, rowId);
  }

  public getDocument(rowId: Id) {
    return storageService
      .getStore()
      .getRow(this.documentTable, rowId) as unknown as Note;
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
  }

  public setDocumentContent(rowId: Id, content: string) {
    storageService
      .getStore()
      .setCell(this.documentTable, rowId, 'content', () => content);
  }
}

const documentsService = new DocumentsService();
export default documentsService;
