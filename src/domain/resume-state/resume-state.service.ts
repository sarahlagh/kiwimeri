import { SerializedSelection } from '@/common/wysiwyg/lexical/selection-serializer';
import { getSpace } from '@/core/db/store';
import storageService from '@/db/storage.service';
import { Id } from 'tinybase/with-schemas';
import { DocumentResumeState, DocumentResumeStateRow } from './model';

class DocumentResumeStateService {
  public setLastSelection(
    itemId: Id,
    lastSelection: SerializedSelection | null
  ) {
    if (!lastSelection) {
      getSpace().delCell('document_resume_state', itemId, 'lastSelection');
    } else {
      getSpace().setCell(
        'document_resume_state',
        itemId,
        'lastSelection',
        lastSelection
      );
    }
  }

  public setLastSelectedComment(itemId: Id, commentId: Id | null) {
    if (!commentId) {
      getSpace().delCell(
        'document_resume_state',
        itemId,
        'lastSelectedCommentId'
      );
    } else {
      getSpace().setCell(
        'document_resume_state',
        itemId,
        'lastSelectedCommentId',
        commentId
      );
    }
  }

  public getResumeState(itemId: Id): DocumentResumeState | null {
    return storageService
      .getSpace()
      .getRow('document_resume_state', itemId) as DocumentResumeStateRow;
  }
}

export const resumeService = new DocumentResumeStateService();
