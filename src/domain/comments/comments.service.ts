import { setFieldMeta } from '@/collection/collection';
import { genericReorder } from '@/common/dnd/utils';
import { minimizeContentForStorage } from '@/common/wysiwyg/compress-file-content';
import { PREVIEW_SIZE } from '@/constants';
import { space } from '@/core/db/store';
import collectionService, { initialContent } from '@/db/collection.service';
import { SortableType } from '@/shared/utils/sort-filter/sort';
import { SerializedEditorState } from 'lexical';
import { getUniqueId, Id } from 'tinybase/common';
import { CommentRow, CommentSort } from './model';

const C = 'comments';
const CL = 'collection';

class CommentsService {
  public newCommentObj(itemId: Id): { item: CommentRow; id: Id } {
    const id = getUniqueId();
    const content = initialContent();
    const now = Date.now();
    const comment: CommentRow = {
      itemId,
      content,
      content_meta: setFieldMeta('', now),
      plainText: '',
      createdAt: now,
      updatedAt: now
    };
    return { item: comment, id };
  }

  public addComment(docId: Id, order?: number) {
    const { item, id } = this.newCommentObj(docId);
    space.transaction(() => {
      space.setRow(C, id, { ...item, order });
      space.setCell(CL, docId, 'updated', Date.now());
    });
    return id;
  }

  public saveComments(docId: Id, comments: CommentRow[]) {
    space.transaction(() => {
      comments.forEach(comment => {
        space.setRow(C, getUniqueId(), { ...comment, itemId: docId });
      });
      space.setCell('collection', docId, 'updated', Date.now());
    });
  }

  public editComment(id: Id, content: SerializedEditorState) {
    const contentStr = minimizeContentForStorage(content);
    space.transaction(() => {
      const now = Date.now();
      space.setPartialRow(C, id, {
        content: contentStr,
        content_meta: setFieldMeta(contentStr, now),
        updatedAt: now
      });
      space.delCell(C, id, 'conflict');
      const itemId = space.getCell(C, id, 'itemId');
      space.setCell(CL, itemId!, 'updated', now);
    });
  }

  public deleteComment(id: Id) {
    space.transaction(() => {
      const itemId = space.getCell(C, id, 'itemId');
      space.setCell(CL, itemId!, 'updated', Date.now());
      space.delRow(C, id);
    });
  }

  public reorderComments(comments: SortableType[], from: number, to: number) {
    if (comments.length === 0) return;
    const now = Date.now();
    space.transaction(() => {
      if (comments[0].order === -1) {
        // first time, reorder all
        comments.forEach((c, i) => {
          space.setPartialRow(C, c.id, {
            order: i,
            order_meta: setFieldMeta(`${c.id}`, now)
          });
        });
      }
      genericReorder(from, to, (idx, order) => {
        space.setPartialRow(C, comments[idx].id, {
          order,
          order_meta: setFieldMeta(`${order}`, now)
        });
      });
      const itemId = space.getCell(C, comments[0].id, 'itemId');
      space.setCell(CL, itemId!, 'updated', Date.now());
    });
  }

  public getContent(id: Id) {
    return space.getCell(C, id, 'content');
  }

  public getPreview(id: Id) {
    return space.getCell(C, id, 'plainText')?.substring(0, PREVIEW_SIZE) || '';
  }

  public getCommentInfo(id: Id) {
    const itemId = space.getCell(C, id, 'itemId') as string;
    const createdAt = space.getCell(C, id, 'createdAt');
    const updatedAt = space.getCell(C, id, 'updatedAt');
    return { createdAt, updatedAt, itemId };
  }

  public setCommentSort(docId: Id, newCommentSort: CommentSort) {
    const effectiveOpts = collectionService.getItemEffectiveDisplayOpts(docId);
    effectiveOpts.documentSort = newCommentSort;
    collectionService.setItemDisplayOpts(docId, effectiveOpts);
  }

  public exists(id: Id) {
    return space.hasRow(C, id);
  }

  public isConflict(id: Id) {
    return space.getCell(C, id, 'conflict') !== undefined;
  }
}

export const commentsService = new CommentsService();
