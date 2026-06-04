import { genericReorder } from '@/common/dnd/utils';
import { minimizeContentForStorage } from '@/common/wysiwyg/compress-file-content';
import { PREVIEW_SIZE } from '@/constants';
import { space } from '@/core/db/store';
import { setMetaField } from '@/core/db/types';
import collectionService, { initialContent } from '@/db/collection.service';
import { SortableType } from '@/shared/utils/sort-filter/sort';
import { SerializedEditorState } from 'lexical';
import { getUniqueId, Id } from 'tinybase/common';
import { DOC_ANNOTATION_TABLE, DocAnnotationRow, NotesSort } from './model';

const DA = DOC_ANNOTATION_TABLE;
const CL = 'collection';

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
      plainText: '',
      createdAt: now,
      updatedAt: now
    };
    return { item: note, id };
  }

  public addNote(docId: Id, order?: number) {
    const { item, id } = this.newNoteObj(docId);
    space.transaction(() => {
      space.setRow(DA, id, { ...item, order });
      space.setCell(CL, docId, 'updated', Date.now());
    });
    return id;
  }

  public saveNotes(docId: Id, notes: DocAnnotationRow[]) {
    space.transaction(() => {
      notes.forEach(note => {
        space.setRow(DA, getUniqueId(), { ...note, itemId: docId });
      });
      space.setCell('collection', docId, 'updated', Date.now());
    });
  }

  public edit(id: Id, content: SerializedEditorState) {
    const contentStr = minimizeContentForStorage(content);
    space.transaction(() => {
      const now = Date.now();
      space.setPartialRow(DA, id, {
        content: contentStr,
        content_meta: setMetaField(now, contentStr),
        updatedAt: now
      });
      space.delCell(DA, id, 'conflict');
      const itemId = space.getCell(DA, id, 'itemId');
      space.setCell(CL, itemId!, 'updated', now);
    });
  }

  public delete(id: Id) {
    space.transaction(() => {
      const itemId = space.getCell(DA, id, 'itemId');
      space.setCell(CL, itemId!, 'updated', Date.now());
      space.delRow(DA, id);
    });
  }

  public reorder(notes: SortableType[], from: number, to: number) {
    if (notes.length === 0) return;
    const now = Date.now();
    space.transaction(() => {
      if (notes[0].order === -1) {
        // first time, reorder all
        notes.forEach((n, i) => {
          space.setPartialRow(DA, n.id, {
            order: i,
            order_meta: setMetaField(now, `${n.id}`)
          });
        });
      }
      genericReorder(from, to, (idx, order) => {
        space.setPartialRow(DA, notes[idx].id, {
          order,
          order_meta: setMetaField(now, `${order}`)
        });
      });
      const itemId = space.getCell(DA, notes[0].id, 'itemId');
      space.setCell(CL, itemId!, 'updated', Date.now());
    });
  }

  public getContent(id: Id) {
    return space.getCell(DA, id, 'content');
  }

  public getPreview(id: Id) {
    return space.getCell(DA, id, 'plainText')?.substring(0, PREVIEW_SIZE) || '';
  }

  public getAnnotInfo(id: Id) {
    const itemId = space.getCell(DA, id, 'itemId') as string;
    const createdAt = space.getCell(DA, id, 'createdAt');
    const updatedAt = space.getCell(DA, id, 'updatedAt');
    return { createdAt, updatedAt, itemId };
  }

  public setNotesSortOnDocument(docId: Id, newNoteSort: NotesSort) {
    const effectiveOpts = collectionService.getItemEffectiveDisplayOpts(docId);
    effectiveOpts.documentSort = newNoteSort;
    collectionService.setItemDisplayOpts(docId, effectiveOpts);
  }

  public exists(id: Id) {
    return space.hasRow(DA, id);
  }

  public isConflict(id: Id) {
    return space.getCell(DA, id, 'conflict') !== undefined;
  }
}

export const docAnnotationsService = new DocumentAnnotationsService();
