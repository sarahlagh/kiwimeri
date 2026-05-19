import { genericReorder } from '@/common/dnd/utils';
import { minimizeContentForStorage } from '@/common/wysiwyg/compress-file-content';
import { getSpace } from '@/core/db/store';
import collectionService, { initialContent } from '@/db/collection.service';
import { getPlainText } from '@/shared/utils/getPlainText';
import { SortableType } from '@/shared/utils/sort-filter/sort';
import { SerializedEditorState } from 'lexical';
import { getUniqueId, Id } from 'tinybase/common';
import { CommentRow, CommentSort } from './model';

class CommentsService {
  public newCommentObj(itemId: Id): { item: CommentRow; id: Id } {
    const id = getUniqueId();
    const content = initialContent();
    const now = Date.now();
    const comment: CommentRow = {
      itemId,
      content,
      plainText: '',
      createdAt: now,
      updatedAt: now
    };
    return { item: comment, id };
  }

  public addComment(docId: Id, order?: number) {
    const { item, id } = this.newCommentObj(docId);
    getSpace().setRow('comments', id, { ...item, order });
    const space = getSpace();
    space.transaction(() => {
      space.setRow('comments', id, { ...item, order });
      space.setCell('collection', docId, 'updated', Date.now());
    });
    return id;
  }

  public addComments(docId: Id, comments: CommentRow[]) {
    const space = getSpace();
    space.transaction(() => {
      comments.forEach(comment => {
        const id = getUniqueId();
        space.setRow('comments', id, { ...comment, itemId: docId });
      });
      space.setCell('collection', docId, 'updated', Date.now());
    });
  }

  public editComment(id: Id, content: SerializedEditorState) {
    const space = getSpace();
    space.transaction(() => {
      const now = Date.now();
      space.setPartialRow('comments', id, {
        content: minimizeContentForStorage(content),
        plainText: getPlainText(content),
        updatedAt: now
      });
      const itemId = space.getCell('comments', id, 'itemId');
      space.setCell('collection', itemId!, 'updated', now);
    });
  }

  public deleteComment(id: Id) {
    const space = getSpace();
    space.transaction(() => {
      const itemId = space.getCell('comments', id, 'itemId');
      space.setCell('collection', itemId!, 'updated', Date.now());
      space.delRow('comments', id);
    });
  }

  public reorderComments(comments: SortableType[], from: number, to: number) {
    if (comments.length === 0) return;
    const space = getSpace();
    space.transaction(() => {
      if (comments[0].order === -1) {
        // first time, reorder all
        comments.forEach((c, i) => {
          space.setCell('comments', c.id, 'order', i);
        });
      }
      genericReorder(from, to, (idx, order) => {
        space.setCell('comments', comments[idx].id, 'order', order);
      });
      const itemId = space.getCell('comments', comments[0].id, 'itemId');
      space.setCell('collection', itemId!, 'updated', Date.now());
    });
  }

  public getCommentContent(id: Id) {
    return getSpace().getCell('comments', id, 'content');
  }

  public getCommentInfo(id: Id) {
    const itemId = getSpace().getCell('comments', id, 'itemId') as string;
    const createdAt = getSpace().getCell('comments', id, 'createdAt');
    const updatedAt = getSpace().getCell('comments', id, 'updatedAt');
    return { createdAt, updatedAt, itemId };
  }

  public setCommentSort(docId: Id, newCommentSort: CommentSort) {
    const effectiveOpts = collectionService.getItemEffectiveDisplayOpts(docId);
    effectiveOpts.documentSort = newCommentSort;
    collectionService.setItemDisplayOpts(docId, effectiveOpts);
  }
}

export const commentsService = new CommentsService();
