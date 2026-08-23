import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { schedule } from '@/core/tasks/scheduler.service';
import { TaskNames } from '@/core/tasks/tasks-registry';
import { findIndexByPersistentId } from '@/features/document-editor/wysiwyg-editor/lexical/block-state';
import type {
  EditorState,
  SerializedEditorState,
  SerializedLexicalNode
} from 'lexical';
import collectionService from '../collection/collection.service';
import { annotsService } from '../collection/doc-annotations.service';
import { DocumentEdit, DocumentEditRow } from './document-edits';

const E = SpaceTables.DocumentEdits;

class DocumentWriterService {
  public fastWrite(
    on: string,
    rowId: string,
    editorState: EditorState,
    isSelectionChange: boolean,
    blocksChanged: SerializedLexicalNode[],
    hasDeletedNodes: boolean
  ) {
    // TODO
    // console.debug('blocks changed', blocksChanged, hasDeletedNodes);
    if (isSelectionChange) return; // TODO
    if (blocksChanged.length === 0 && !hasDeletedNodes) return;
    space.addRow(E, {
      on,
      itemId: rowId,
      createdAt: Date.now(),
      json: hasDeletedNodes
        ? JSON.stringify(editorState.toJSON())
        : JSON.stringify(blocksChanged),
      isFullSnapshot: hasDeletedNodes
    });
    schedule.in(1000, TaskNames.FAST_WRITE, {
      on,
      rowId
    });
  }

  public reconcile(on: string, itemId: string) {
    const edits = this.getEdits(on, itemId);
    let content = JSON.parse(this.getContent(on, itemId));

    edits.forEach(edit => {
      if (edit.isFullSnapshot) {
        content = JSON.parse(edit.json);
      } else {
        const diff = JSON.parse(edit.json) as SerializedLexicalNode[];
        const editorState = content as SerializedEditorState;
        const idx = findIndexByPersistentId(editorState, diff[0]);
        if (idx !== undefined) {
          for (let i = 0; i < diff.length; i++) {
            editorState.root.children[idx + i] = diff[i];
          }
        } else {
          // TODO error??
          throw new Error(
            `unable to reconcile document edit ${on} ${itemId} ${edit.id}`
          );
        }
      }
    });

    space.transaction(() => {
      edits.forEach(e => space.delRow(E, e.id));
    });
    return JSON.stringify(content);
  }

  private getContent(on: string, itemId: string) {
    return on === SpaceTables.Collection
      ? collectionService.getDocumentContent(itemId)
      : annotsService.getContent(itemId);
  }

  private getEdits(on: string, itemId: string): DocumentEdit[] {
    const table = space.getTable(E);
    const edits: DocumentEdit[] = [];
    space.getSortedRowIds(E, 'createdAt').forEach(rowId => {
      if (table[rowId].on !== on || table[rowId].itemId !== itemId) return;
      edits.push({
        ...(table[rowId] as DocumentEditRow),
        id: rowId
      });
    });
    return edits;
  }
}

export const writer = new DocumentWriterService();
