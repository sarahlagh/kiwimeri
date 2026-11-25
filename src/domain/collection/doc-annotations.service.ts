import { space, spaceDocContent } from '@/core/db/store';
import { SpaceDocContentTables, SpaceTables } from '@/core/db/store-constants';
import { MetaField, setMetaField } from '@/core/db/types';
import { initialContent } from '@/domain/collection/collection.service';
import { genericReorder } from '@/shared/dnd/utils';
import { SortableType } from '@/shared/misc/sort-filter/sort';
import type { SerializedEditorState } from 'lexical';
import { getUniqueId, Id } from 'tinybase/common';
import { NotesSort } from './collection-settings';
import { settingsService } from './collection-settings.service';
import { BaseDocAnnotation, DocAnnotation } from './document-annotations';
import { ProjectionEngine } from './projection-engine';

const A = SpaceTables.Annotations;
const AC = SpaceDocContentTables.AnnotationContent;
const C = SpaceTables.Collection;
const AV = SpaceTables.AnnotationView;

class DocumentAnnotationsService {
  public newNoteObj(itemId: Id): { item: BaseDocAnnotation; id: Id } {
    const id = getUniqueId();
    const content = initialContent();
    const now = Date.now();
    const note: BaseDocAnnotation = {
      type: 'note',
      parentId: itemId,
      content,
      content_meta: setMetaField(now),
      createdAt: now,
      updatedAt: now
    };
    return { item: note, id };
  }

  public addNote(docId: Id, order?: number, _id?: string) {
    const { item, id } = this.newNoteObj(docId);
    const noteId = _id ? _id : id;
    const content = item.content;
    const content_meta = item.content_meta;
    const projectionEngine = new ProjectionEngine();
    space.transaction(() => {
      space.setRow(A, noteId, { ...item, order });
      projectionEngine.__updateAncestryLastActivityAt(item.updatedAt, docId);
    });
    spaceDocContent.setPartialRow(AC, noteId, {
      content,
      content_meta
    });
    return noteId;
  }

  public saveNotesForDoc(
    docId: Id,
    notes: (BaseDocAnnotation | DocAnnotation)[],
    projectionEngine?: ProjectionEngine
  ) {
    if (!projectionEngine) projectionEngine = new ProjectionEngine();
    const contents = new Map<
      string,
      { content: string; content_meta: MetaField }
    >();
    const updatedAt = Math.max(...notes.map(n => n.updatedAt));
    space.transaction(() => {
      notes.forEach(note => {
        const id = 'id' in note ? note.id : getUniqueId();
        contents.set(id, {
          content: note.content,
          content_meta: note.content_meta
        });
        space.setRow(A, id, { ...note, parentId: docId });
      });
      if (projectionEngine.$hasAncetryPath(docId)) {
        projectionEngine.__updateAncestryLastActivityAt(updatedAt, docId);
      }
    });
    spaceDocContent.transaction(() => {
      contents.forEach((partial, noteId) =>
        spaceDocContent.setPartialRow(AC, noteId, partial)
      );
    });
  }

  public saveNotes(notes: (BaseDocAnnotation | DocAnnotation)[]) {
    const notesPerDocs = new Map<
      string,
      (BaseDocAnnotation | DocAnnotation)[]
    >();
    notes.forEach(n => {
      if (!notesPerDocs.has(n.parentId)) {
        notesPerDocs.set(n.parentId, []);
      }
      notesPerDocs.get(n.parentId)?.push(n);
    });
    const projectionEngine = new ProjectionEngine();
    space.startTransaction();
    spaceDocContent.startTransaction();
    try {
      notesPerDocs.forEach((notes, docId) => {
        this.saveNotesForDoc(docId, notes, projectionEngine);
      });
    } finally {
      spaceDocContent.finishTransaction();
      space.finishTransaction();
    }
  }

  public edit(id: Id, content: SerializedEditorState | string) {
    const now = Date.now();
    const contentStr =
      typeof content !== 'string' ? JSON.stringify(content) : content;
    const docId = space.getCell(A, id, 'parentId')!;
    const projectionEngine = new ProjectionEngine();
    space.transaction(() => {
      space.setCell(A, id, 'updatedAt', now);
      space.delCell(A, id, 'conflictId');
      projectionEngine.__updateAncestryLastActivityAt(now, docId);
    });
    spaceDocContent.setPartialRow(AC, id, {
      content: contentStr,
      content_meta: setMetaField(now, contentStr)
    });
  }

  public delete(rowId: Id) {
    const projectionEngine = new ProjectionEngine();
    space.transaction(() => {
      projectionEngine.$deleteAnnot(rowId);
      const docId = space.getCell(A, rowId, 'parentId');
      if (docId && space.hasRow(C, docId)) {
        const parentId = space.getCell(C, docId, 'parentId');
        // recacl for document must take into account annot index
        projectionEngine.__recalcDocumentLastActivityAt(docId);
        projectionEngine.__recalcAncestryLastActivityAt([parentId!]);
      }
      space.delRow(A, rowId);
      this.cleanupDeletedAnnot(rowId);
    });
  }

  public cleanupDeletedAnnot(rowId: Id) {
    space.delRow(AV, rowId);
    spaceDocContent.delRow(AC, rowId);
  }

  public deleteAll(parentId: Id) {
    const table = space.getTable(A);
    space.transaction(() => {
      space.getRowIds(A).forEach(rowId => {
        if (table[rowId].parentId === parentId) {
          this.delete(rowId);
        }
      });
    });
  }

  public reorder(notes: SortableType[], from: number, to: number) {
    if (notes.length === 0) return;
    const now = Date.now();
    space.transaction(() => {
      if (notes[0].order === -1) {
        // first time, reorder all
        notes.forEach((n, i) => {
          space.setPartialRow(A, n.id, {
            order: i,
            order_meta: setMetaField(now, `${n.id}`)
          });
        });
      }
      genericReorder(from, to, (idx, order) => {
        space.setPartialRow(A, notes[idx].id, {
          order,
          order_meta: setMetaField(now, `${order}`)
        });
      });
    });
  }

  public getContent(id: Id) {
    return spaceDocContent.getCell(AC, id, 'content') || '';
  }

  public getPreview(id: Id) {
    return space.getCell(AV, id, 'previewText') || '';
  }

  public getAnnotInfo(id: Id) {
    const parentId = space.getCell(A, id, 'parentId') as string;
    const createdAt = space.getCell(A, id, 'createdAt');
    const updatedAt = space.getCell(A, id, 'updatedAt');
    return { createdAt, updatedAt, parentId };
  }

  public setNotesSortOnDocument(docId: Id, newNoteSort: NotesSort) {
    settingsService.setDocumentSort(docId, newNoteSort);
  }

  public exists(id: Id) {
    return space.hasRow(A, id);
  }

  public isConflict(id: Id) {
    return space.getCell(A, id, 'conflictId') !== undefined;
  }
}

export const annotsService = new DocumentAnnotationsService();
