import { space, spaceDocContent } from '@/core/db/store';
import { SpaceDocContentTables, SpaceTables } from '@/core/db/store-constants';
import { MetaField, setMetaField } from '@/core/db/types';
import { initialContent } from '@/domain/collection/collection.service';
import { minimizeContentForStorage } from '@/domain/collection/compress-file-content';
import { genericReorder } from '@/shared/dnd/utils';
import { SortableType } from '@/shared/misc/sort-filter/sort';
import type { SerializedEditorState } from 'lexical';
import { getUniqueId, Id } from 'tinybase/common';
import { storageService } from '../space-merging/storage.service';
import { NotesSort } from './collection-settings';
import { settingsService } from './collection-settings.service';
import { BaseDocAnnotation } from './document-annotations';
import { getDerivedId } from './document-content';

const A = SpaceTables.Annotations;
const AC = SpaceDocContentTables.AnnotationContent;
const C = SpaceTables.Collection;
const DP = SpaceTables.DerivedPreview;

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

  public addNote(docId: Id, order?: number) {
    const { item, id } = this.newNoteObj(docId);
    const content = item.content;
    const content_meta = item.content_meta;
    space.transaction(() => {
      space.setRow(A, id, { ...item, order });
      space.setCell(C, docId, 'updatedAt', Date.now());
    });
    spaceDocContent.setPartialRow(AC, id, {
      content,
      content_meta
    });
    return id;
  }

  public saveNotes(docId: Id, notes: BaseDocAnnotation[]) {
    const contents = new Map<
      string,
      { content: string; content_meta: MetaField }
    >();
    space.transaction(() => {
      notes.forEach(note => {
        const id = getUniqueId();
        contents.set(id, {
          content: note.content,
          content_meta: note.content_meta
        });
        space.setRow(A, id, { ...note, parentId: docId });
      });
      space.setCell(C, docId, 'updatedAt', Date.now());
    });
    spaceDocContent.transaction(() => {
      contents.forEach((partial, noteId) =>
        spaceDocContent.setPartialRow(AC, noteId, partial)
      );
    });
  }

  public edit(id: Id, content: SerializedEditorState) {
    const now = Date.now();
    const contentStr = minimizeContentForStorage(content);
    space.transaction(() => {
      space.setCell(A, id, 'updatedAt', now);
      space.delCell(A, id, 'conflictId');
      const itemId = space.getCell(A, id, 'parentId');
      space.setCell(C, itemId!, 'updatedAt', now);
    });
    spaceDocContent.setPartialRow(AC, id, {
      content: contentStr,
      content_meta: setMetaField(now, contentStr)
    });
  }

  public delete(id: Id) {
    space.transaction(() => {
      const itemId = space.getCell(A, id, 'parentId');
      if (itemId && space.hasRow(C, itemId)) {
        space.setCell(C, itemId, 'updatedAt', Date.now());
      }
      space.delRow(A, id);
      storageService.cleanupRow(id, A);
    });
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
      const itemId = space.getCell(A, notes[0].id, 'parentId');
      space.setCell(C, itemId!, 'updatedAt', Date.now());
    });
  }

  public getContent(id: Id) {
    return spaceDocContent.getCell(AC, id, 'content') || '';
  }

  public getPreview(id: Id) {
    return space.getCell(DP, getDerivedId('a', id), 'previewText') || '';
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
