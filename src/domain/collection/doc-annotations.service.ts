import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { setMetaField } from '@/core/db/types';
import { initialContent } from '@/domain/collection/collection.service';
import { minimizeContentForStorage } from '@/domain/collection/compress-file-content';
import { genericReorder } from '@/shared/dnd/utils';
import { SortableType } from '@/shared/misc/sort-filter/sort';
import type { SerializedEditorState } from 'lexical';
import { getUniqueId, Id } from 'tinybase/common';
import storageService from '../storage.service';
import { NotesSort } from './collection-settings';
import { settingsService } from './collection-settings.service';
import { DocAnnotationRow } from './document-annotations';
import { getDerivedId } from './document-content';

const A = SpaceTables.Annotations;
const C = SpaceTables.Collection;
const DP = SpaceTables.DerivedPreview;

class DocumentAnnotationsService {
  public newNoteObj(itemId: Id): { item: DocAnnotationRow; id: Id } {
    const id = getUniqueId();
    const content = initialContent();
    const now = Date.now();
    const note: DocAnnotationRow = {
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
    space.transaction(() => {
      space.setRow(A, id, { ...item, order });
      space.setCell(C, docId, 'updatedAt', Date.now());
    });
    return id;
  }

  public saveNotes(docId: Id, notes: DocAnnotationRow[]) {
    space.transaction(() => {
      notes.forEach(note => {
        space.setRow(A, getUniqueId(), { ...note, parentId: docId });
      });
      space.setCell('collection', docId, 'updatedAt', Date.now());
    });
  }

  public edit(id: Id, content: SerializedEditorState) {
    const contentStr = minimizeContentForStorage(content);
    space.transaction(() => {
      const now = Date.now();
      space.setPartialRow(A, id, {
        content: contentStr,
        content_meta: setMetaField(now, contentStr),
        updatedAt: now
      });
      space.delCell(A, id, 'conflictId');
      const itemId = space.getCell(A, id, 'parentId');
      space.setCell(C, itemId!, 'updatedAt', now);
    });
  }

  public delete(id: Id) {
    space.transaction(() => {
      const itemId = space.getCell(A, id, 'parentId');
      space.setCell(C, itemId!, 'updatedAt', Date.now());
      space.delRow(A, id);
      storageService.cleanupRow(id, A);
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
    return space.getCell(A, id, 'content');
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

export const docAnnotationsService = new DocumentAnnotationsService();
