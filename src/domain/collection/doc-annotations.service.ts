import { space, spaceContent } from '@/core/db/store';
import { SpaceContentTables, SpaceTables } from '@/core/db/store-constants';
import { setMetaField } from '@/core/db/types';
import collectionService, {
  initialContent
} from '@/domain/collection/collection.service';
import { minimizeContentForStorage } from '@/domain/collection/compress-file-content';
import { genericReorder } from '@/shared/dnd/utils';
import { SortableType } from '@/shared/misc/sort-filter/sort';
import type { SerializedEditorState } from 'lexical';
import { getUniqueId, Id } from 'tinybase/common';
import { NotesSort } from './collection-settings';
import { settingsService } from './collection-settings.service';
import { DocAnnotationRow } from './document-annotations';
import { getDerivedId } from './document-content';

const A = SpaceTables.Annotations;
const C = SpaceTables.Collection;
const DP = SpaceTables.DerivedPreview;
const DC = SpaceContentTables.DerivedContent;

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
      space.setCell(C, docId, 'updatedAt', Date.now());
    });
    return id;
  }

  public saveNotes(docId: Id, notes: DocAnnotationRow[]) {
    space.transaction(() => {
      notes.forEach(note => {
        space.setRow(A, getUniqueId(), { ...note, itemId: docId });
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
      const itemId = space.getCell(A, id, 'itemId');
      space.setCell(C, itemId!, 'updatedAt', now);
    });
  }

  public delete(id: Id) {
    const derivedId = getDerivedId('a', id);
    space.transaction(() => {
      const itemId = space.getCell(A, id, 'itemId');
      space.setCell(C, itemId!, 'updatedAt', Date.now());
      space.delRow(A, id);
      collectionService.cleanupDerivedState(id, A);
    });
    spaceContent.delRow(DC, derivedId);
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
    return space.getCell(A, id, 'conflictId') !== undefined;
  }
}

export const docAnnotationsService = new DocumentAnnotationsService();
