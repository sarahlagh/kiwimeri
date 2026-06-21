import { SerializedSelection } from '@/common/wysiwyg/lexical/selection-serializer';
import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-schema';
import { Id } from 'tinybase/with-schemas';
import { DocumentResumeState, DocumentResumeStateRow } from './model';

class ResumeStateService {
  public setLastSelection(
    itemId: Id,
    lastSelection: SerializedSelection | null
  ) {
    if (!lastSelection) {
      space.delCell(SpaceTables.ResumeState, itemId, 'lastSelection');
    } else {
      space.setCell(
        SpaceTables.ResumeState,
        itemId,
        'lastSelection',
        lastSelection
      );
    }
  }

  public setLastSelectedNote(itemId: Id, noteId: Id | null) {
    if (!noteId) {
      space.delCell(SpaceTables.ResumeState, itemId, 'lastSelectedNoteId');
    } else {
      space.setCell(
        SpaceTables.ResumeState,
        itemId,
        'lastSelectedNoteId',
        noteId
      );
    }
  }

  public getDocumentResumeState(itemId: Id): DocumentResumeState | null {
    return space.getRow(
      SpaceTables.ResumeState,
      itemId
    ) as DocumentResumeStateRow;
  }
}

export const resumeService = new ResumeStateService();
