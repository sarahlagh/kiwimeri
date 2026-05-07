import { minimizeContentForStorage } from '@/common/wysiwyg/compress-file-content';
import { initialContent } from '@/db/collection.service';
import storageService from '@/db/storage.service';
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

  public addComment(itemId: Id) {
    const { item, id } = this.getCommentObj(itemId);
    storageService.getSpace().setRow('comments', id, item);
    return id;
  }

  public editComment(id: Id, content: SerializedEditorState) {
    const space = storageService.getSpace();
    space.transaction(() => {
      const now = Date.now();
      space.setPartialRow('comments', id, {
        content: minimizeContentForStorage(content),
        plainText: getPlainText(content),
        updatedAt: now
      });
      const itemId = space.getCell('comments', id, 'itemId') as string;
      space.setCell('collection', itemId, 'updated', now);
    });
  }

  public deleteComment(id: Id) {
    storageService.getSpace().delRow('comments', id);
  }

  public getComments(itemId: Id) {
    // TODO dynamic sort
    return fetchCommentsQuery.getResults({ itemId }, 'createdAt', false);
  }
}

export const commentsService = new CommentsService();
