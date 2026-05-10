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
  public getCommentObj(itemId: Id): { item: CommentRow; id: Id } {
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
    const { item, id } = this.getCommentObj(docId);
    getSpace().setRow('comments', id, { ...item, order });
    return id;
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
      // TODO reactivate, but don't let that trigger re-rerender
      // const itemId = space.getCell('comments', id, 'itemId');
      // space.setCell('collection', itemId!, 'updated', now);
    });
  }

  public deleteComment(id: Id) {
    getSpace().delRow('comments', id);
  }

  public getCommentContent(id: Id) {
    return getSpace().getCell('comments', id, 'content');
  }

  public getCommentInfo(id: Id) {
    const createdAt = getSpace().getCell('comments', id, 'createdAt');
    const updatedAt = getSpace().getCell('comments', id, 'updatedAt');
    return { createdAt, updatedAt };
  }

  public setCommentSort(docId: Id, newCommentSort: CommentSort) {
    const effectiveOpts = collectionService.getItemEffectiveDisplayOpts(docId);
    effectiveOpts.documentSort = newCommentSort;
    collectionService.setItemDisplayOpts(docId, effectiveOpts);
  }

  public reorderComments(comments: SortableType[], from: number, to: number) {
    const space = getSpace();
    space.transaction(() => {
      genericReorder(from, to, (idx, order) => {
        space.setCell('comments', comments[idx].id, 'order', order);
      });
    });
  }
}

export const commentsService = new CommentsService();
