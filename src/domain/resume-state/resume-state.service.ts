import { SerializedSelection } from '@/common/wysiwyg/lexical/selection-serializer';
import { space } from '@/core/db/store';
import { Id } from 'tinybase/with-schemas';
import { DocumentResumeState, DocumentResumeStateRow } from './model';

class DocumentResumeStateService {
  public setLastSelection(
    itemId: Id,
    lastSelection: SerializedSelection | null
  ) {
    if (!lastSelection) {
      space.delCell('document_resume_state', itemId, 'lastSelection');
    } else {
      space.setCell(
        'document_resume_state',
        itemId,
        'lastSelection',
        lastSelection
      );
    }
  }

  public setLastSelectedNote(itemId: Id, noteId: Id | null) {
    if (!noteId) {
      space.delCell('document_resume_state', itemId, 'lastSelectedNoteId');
    } else {
      space.setCell(
        'document_resume_state',
        itemId,
        'lastSelectedNoteId',
        noteId
      );
    }
  }

  public getResumeState(itemId: Id): DocumentResumeState | null {
    return space.getRow(
      'document_resume_state',
      itemId
    ) as DocumentResumeStateRow;
  }
}

export const resumeService = new DocumentResumeStateService();
