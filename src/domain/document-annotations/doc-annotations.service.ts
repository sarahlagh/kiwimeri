import { genericReorder } from '@/common/dnd/utils';
import { minimizeContentForStorage } from '@/common/wysiwyg/compress-file-content';
import { PREVIEW_SIZE } from '@/constants';
import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { setMetaField } from '@/core/db/types';
import { initialContent } from '@/db/collection.service';
import { SortableType } from '@/shared/utils/sort-filter/sort';
import { SerializedEditorState } from 'lexical';
import { getUniqueId, Id } from 'tinybase/common';
import { settingsService } from '../collection-settings/collection-settings.service';
import { NotesSort } from '../collection-settings/model';
import { DocAnnotationRow } from './model';

const A = SpaceTables.Annotations;
const C = SpaceTables.Collection;
const D = SpaceTables.DerivedContent;

class DocumentAnnotationsService {
  public newNoteObj(itemId: Id): { item: DocAnnotationRow; id: Id } {
    const id = getUniqueId();
    const content = initialContent();
    const now = Date.now();
    const note: DocAnnotationRow = {
      type: 'note',
      itemId,
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
      space.setCell(C, docId, 'updated', Date.now());
    });
    return id;
  }

  public saveNotes(docId: Id, notes: DocAnnotationRow[]) {
    space.transaction(() => {
      notes.forEach(note => {
        space.setRow(A, getUniqueId(), { ...note, itemId: docId });
      });
      space.setCell('collection', docId, 'updated', Date.now());
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
      space.delCell(A, id, 'conflict');
      const itemId = space.getCell(A, id, 'itemId');
      space.setCell(C, itemId!, 'updated', now);
    });
  }

  public delete(id: Id) {
    space.transaction(() => {
      const itemId = space.getCell(A, id, 'itemId');
      space.setCell(C, itemId!, 'updated', Date.now());
      space.delRow(A, id);
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
      const itemId = space.getCell(A, notes[0].id, 'itemId');
      space.setCell(C, itemId!, 'updated', Date.now());
    });
  }

  public getContent(id: Id) {
    return space.getCell(A, id, 'content');
  }

  public getPreview(id: Id) {
    return space.getCell(D, id, 'plainText')?.substring(0, PREVIEW_SIZE) || '';
  }

  public getAnnotInfo(id: Id) {
    const itemId = space.getCell(A, id, 'itemId') as string;
    const createdAt = space.getCell(A, id, 'createdAt');
    const updatedAt = space.getCell(A, id, 'updatedAt');
    return { createdAt, updatedAt, itemId };
  }

  public setNotesSortOnDocument(docId: Id, newNoteSort: NotesSort) {
    settingsService.setDocumentSort(docId, newNoteSort);
  }

  public exists(id: Id) {
    return space.hasRow(A, id);
  }

  public isConflict(id: Id) {
    return space.getCell(A, id, 'conflict') !== undefined;
  }
}

export const docAnnotationsService = new DocumentAnnotationsService();
