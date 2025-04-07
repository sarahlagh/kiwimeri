import { Id } from 'tinybase/common/with-schemas';
import { useCell, useResultSortedRowIds, useTable } from 'tinybase/ui-react';
import { getGlobalTrans } from '../config';
import { FAKE_ROOT, ROOT_FOLDER } from '../constants';
import { DocumentNodeResult, DocumentNodeType } from '../documents/document';
import storageService from './storage.service';

export const initialContent = () => {
  // 'empty' editor
  return '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';
};

class DocumentsService {
  private readonly documentTable = 'documents';

  public generateFetchAllDocumentNodesQuery(
    parent: string,
    deleted: boolean = false
  ) {
    const queries = storageService.getQueries();
    const queryName = `fetchAllDocumentNodesFor${parent}`;
    if (parent !== FAKE_ROOT) {
      queries.setQueryDefinition(
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
    storageService.getSpace().addRow(this.documentTable, {
      title: getGlobalTrans().newDocTitle,
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
    storageService.getSpace().addRow(this.documentTable, {
      title: getGlobalTrans().newFolderTitle,
      parent: parent,
      created: now,
      updated: now,
      type: DocumentNodeType.folder,
      deleted: false
    });
  }

  public deleteNodeDocument(rowId: Id) {
    this.updateParentUpdatedRecursive(this.getDocumentNodeParent(rowId));
    return storageService.getSpace().delRow(this.documentTable, rowId);
  }

  public documentNodeExists(rowId: Id) {
    if (rowId === ROOT_FOLDER) {
      return true;
    }
    return storageService.getSpace().hasRow(this.documentTable, rowId);
  }

  public getDocumentNodeParent(rowId: Id) {
    return (
      (storageService
        .getSpace()
        .getCell(this.documentTable, rowId, 'parent')
        ?.valueOf() as string) || ROOT_FOLDER
    );
  }

  public setDocumentNodeParent(rowId: Id, parentId: Id) {
    storageService
      .getSpace()
      .setCell(this.documentTable, rowId, 'parent', parentId);
    this.updateParentUpdatedRecursive(this.getDocumentNodeParent(rowId));
  }

  public useDocumentNodeTitle(rowId: Id) {
    const defaultValue =
      rowId === ROOT_FOLDER ? getGlobalTrans().homeTitle : '';
    return (
      (useCell(this.documentTable, rowId, 'title')?.valueOf() as string) ||
      defaultValue
    );
  }

  public getDocumentNodeTitle(rowId: Id) {
    const defaultValue =
      rowId === ROOT_FOLDER ? getGlobalTrans().homeTitle : '';
    return (
      (storageService
        .getSpace()
        .getCell(this.documentTable, rowId, 'title')
        ?.valueOf() as string) || defaultValue
    );
  }

  public setDocumentNodeTitle(rowId: Id, title: string) {
    storageService
      .getSpace()
      .setCell(this.documentTable, rowId, 'title', title);
    storageService
      .getSpace()
      .setCell(this.documentTable, rowId, 'updated', Date.now());
    this.updateParentUpdatedRecursive(this.getDocumentNodeParent(rowId));
  }

  public getDocumentNodeContent(rowId: Id) {
    return (
      (storageService
        .getSpace()
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
      .getSpace()
      .setCell(this.documentTable, rowId, 'content', () => content);
    storageService
      .getSpace()
      .setCell(this.documentTable, rowId, 'updated', Date.now());
    this.updateParentUpdatedRecursive(this.getDocumentNodeParent(rowId));
  }

  public getDocumentType(rowId: Id) {
    return (
      (storageService
        .getSpace()
        .getCell(this.documentTable, rowId, 'type')
        ?.valueOf() as string) || null
    );
  }

  public getBreadcrumb(folder: string) {
    let parent = folder;
    let breadcrumb: string[] = [folder];
    while (parent !== ROOT_FOLDER) {
      parent = this.getDocumentNodeParent(parent);
      breadcrumb = [parent, ...breadcrumb];
    }
    return breadcrumb;
  }

  private updateParentUpdatedRecursive(folder: string) {
    if (folder === ROOT_FOLDER) {
      return;
    }
    storageService
      .getSpace()
      .setCell(this.documentTable, folder, 'updated', Date.now());
    this.updateParentUpdatedRecursive(this.getDocumentNodeParent(folder));
  }
}

const documentsService = new DocumentsService();
export default documentsService;
