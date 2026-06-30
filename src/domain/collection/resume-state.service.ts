import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import notebooksService from '@/domain/collection/notebooks.service';
import { Id } from 'tinybase/with-schemas';
import {
  DocumentResumeState,
  NotebookResumeState,
  SerializedSelection
} from './resume-state';

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

  public setLastDocument(document: Id | null | undefined) {
    const notebookId = notebooksService.getCurrentNotebook();
    if (!document) {
      space.delCell(SpaceTables.ResumeState, notebookId, 'lastDocument');
    } else {
      space.setCell(
        SpaceTables.ResumeState,
        notebookId,
        'lastDocument',
        document
      );
    }
  }

  public setLastFolder(folder: Id) {
    const notebookId = notebooksService.getCurrentNotebook();
    space.setCell(SpaceTables.ResumeState, notebookId, 'lastFolder', folder);
  }

  public getDocumentResumeState(itemId: Id): DocumentResumeState | null {
    if (!space.hasRow(SpaceTables.ResumeState, itemId)) {
      return null;
    }
    return space.getRow(SpaceTables.ResumeState, itemId) as DocumentResumeState;
  }

  public getNotebookResumeState(notebookId?: Id): NotebookResumeState | null {
    if (!notebookId) notebookId = notebooksService.getCurrentNotebook();
    if (!space.hasRow(SpaceTables.ResumeState, notebookId)) {
      return null;
    }
    return space.getRow(
      SpaceTables.ResumeState,
      notebookId
    ) as NotebookResumeState;
  }

  public getCurrentFolder() {
    const notebookId = notebooksService.getCurrentNotebook();
    if (!space.hasRow(SpaceTables.ResumeState, notebookId)) {
      return notebookId;
    }
    return (
      space.getCell(SpaceTables.ResumeState, notebookId, 'lastFolder') ||
      notebookId
    );
  }
}

export const resumeService = new ResumeStateService();
