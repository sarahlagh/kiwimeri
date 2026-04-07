import {
  DocumentResumeState,
  DocumentResumeStateRow
} from '@/collection/collection';
import { SerializedSelection } from '@/common/wysiwyg/lexical/selection-serializer';
import storageService from './storage.service';

class CollectionResumeStateService {
  public setResumeSelection(
    itemId: string,
    lastSelection: SerializedSelection | null
  ) {
    storageService.getSpace().setRow('document_resume_state', itemId, {
      itemId,
      lastSelection: lastSelection ? JSON.stringify(lastSelection) : undefined
    });
  }

  public getResumeState(itemId: string): DocumentResumeState | null {
    // id === itemId for convenience
    const resumeState = storageService
      .getSpace()
      .getRow('document_resume_state', itemId) as DocumentResumeStateRow;
    if (!resumeState) {
      return null;
    }
    return {
      id: resumeState.itemId,
      ...resumeState,
      lastSelection: resumeState.lastSelection
        ? (JSON.parse(resumeState.lastSelection) as SerializedSelection)
        : null
    };
  }
}

export const resumeStateService = new CollectionResumeStateService();
