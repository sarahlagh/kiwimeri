import { minimizeContentForStorage } from '@/common/wysiwyg/compress-file-content';
import { getSpace } from '@/core/db/store';
import { initialContent } from '@/db/collection.service';
import { getPlainText } from '@/shared/utils/getPlainText';
import { SerializedEditorState } from 'lexical';
import { getUniqueId, Id } from 'tinybase/common';
import { CommentRow } from './model';
import fetchCommentsQuery from './queries/fetchCommentsQuery';

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

  public addComment(itemId: Id, order?: number) {
    const { item, id } = this.getCommentObj(itemId);
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

  public getComments(itemId: Id) {
    // TODO dynamic sort
    return fetchCommentsQuery.getResults({ itemId }, 'createdAt', false);
  }

  public getCommentContent(itemId: Id) {
    return getSpace().getCell('comments', itemId, 'content');
  }
}

export const commentsService = new CommentsService();
