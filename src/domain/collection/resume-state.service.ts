import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import notebooksService from '@/domain/collection/notebooks.service';
import { Id } from 'tinybase/with-schemas';
import {
  DocumentResumeState,
  NotebookResumeState,
  SerializedSelection
} from './resume-state';

const RS = SpaceTables.ResumeState;

class ResumeStateService {
  public setLastSelection(
    itemId: Id,
    lastSelection: SerializedSelection | null
  ) {
    if (!lastSelection) {
      space.delCell(RS, itemId, 'lastSelection');
    } else {
      space.setCell(RS, itemId, 'lastSelection', lastSelection);
    }
  }

  public setLastSelectedNote(itemId: Id, noteId: Id | null) {
    if (!noteId) {
      space.delCell(RS, itemId, 'lastSelectedNoteId');
    } else {
      space.setCell(RS, itemId, 'lastSelectedNoteId', noteId);
    }
  }

  public setLastDocument(document: Id | null | undefined) {
    const notebookId = notebooksService.getCurrentNotebook();
    if (!document) {
      space.delCell(RS, notebookId, 'lastDocument');
    } else {
      space.setCell(RS, notebookId, 'lastDocument', document);
    }
  }

  public setLastFolder(folder: Id) {
    const notebookId = notebooksService.getCurrentNotebook();
    space.setCell(RS, notebookId, 'lastFolder', folder);
  }

  public getDocumentResumeState(itemId: Id): DocumentResumeState | null {
    if (!space.hasRow(RS, itemId)) {
      return null;
    }
    return space.getRow(RS, itemId) as DocumentResumeState;
  }

  public getNotebookResumeState(notebookId?: Id): NotebookResumeState | null {
    if (!notebookId) notebookId = notebooksService.getCurrentNotebook();
    if (!space.hasRow(RS, notebookId)) {
      return null;
    }
    return space.getRow(RS, notebookId) as NotebookResumeState;
  }

  public getCurrentFolder() {
    const notebookId = notebooksService.getCurrentNotebook();
    if (!space.hasRow(RS, notebookId)) {
      return notebookId;
    }
    return space.getCell(RS, notebookId, 'lastFolder') || notebookId;
  }
}

export const resumeService = new ResumeStateService();
