import { appConfig } from '@/config';
import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { schedule } from '@/core/tasks/scheduler.service';
import { TaskNames } from '@/core/tasks/tasks-registry';
import type {
  EditorState,
  SerializedEditorState,
  SerializedLexicalNode
} from 'lexical';
import collectionService from '../collection/collection.service';
import { annotsService } from '../collection/doc-annotations.service';
import { DocumentEdit, DocumentEditRow, LexicalDiff } from './document-edits';

const E = SpaceTables.DocumentEdits;

class DocumentWriterService {
  public fastWrite(
    on: string,
    rowId: string,
    editorState: EditorState,
    isSelectionChange: boolean,
    blocksChanged: LexicalDiff[],
    hasDeletedNodes: boolean
  ) {
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
    schedule.in(appConfig.FAST_WRITE_THROTTLE, TaskNames.FAST_WRITE, {
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
        const diff = JSON.parse(edit.json) as LexicalDiff[];
        diff.sort((da, db) => da.idx - db.idx);
        const editorState = content as SerializedEditorState;
        diff.forEach(d => {
          const existing = editorState.root.children[d.idx];
          if (existing) {
            editorState.root.children[d.idx] = d.block;
          } else {
            // if didn't exist insert in place
            editorState.root.children.splice(d.idx, 0, d.block);
          }
        });
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

  private findIndexByPersistentId(
    editorState: SerializedEditorState,
    serializedNode: SerializedLexicalNode | undefined
  ) {
    if (!serializedNode) return -1;
    const persistentId = serializedNode.$?.persistentId;
    if (!persistentId) return -1;
    return editorState.root.children.findIndex(
      p => p.$?.persistentId === persistentId
    );
  }
}

export const writer = new DocumentWriterService();
