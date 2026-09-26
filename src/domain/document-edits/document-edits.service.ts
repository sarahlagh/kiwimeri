import { appConfig } from '@/config';
import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { AnyData } from '@/core/db/types';
import { schedule } from '@/core/tasks/scheduler.service';
import { TaskNames } from '@/core/tasks/tasks-registry';
import type { EditorState, SerializedEditorState } from 'lexical';
import collectionService from '../collection/collection.service';
import { annotsService } from '../collection/doc-annotations.service';
import { deviceSettings } from '../device-settings/device-settings.service';
import { DocumentEdit, DocumentEditRow, LexicalDiff } from './document-edits';

const E = SpaceTables.DocumentEdits;

class DocumentWriterService {
  public fastWriteOrCommit(
    on: string,
    rowId: string,
    editorState: EditorState,
    blocksChanged: LexicalDiff[],
    hasDeletedNodes: boolean,
    originalPayload?: AnyData
  ) {
    if (deviceSettings.isFastWriteEnabled()) {
      writer.fastWrite(
        on,
        rowId,
        editorState,
        blocksChanged,
        hasDeletedNodes,
        deviceSettings.isFastWriteWatchMode() ? originalPayload : undefined
      );
    }
    if (
      deviceSettings.isFastWriteWatchMode() ||
      !deviceSettings.isFastWriteEnabled()
    ) {
      if (on === SpaceTables.Collection) {
        collectionService.setItemLexicalContent(rowId, editorState.toJSON());
      } else {
        annotsService.edit(rowId, editorState.toJSON());
      }
    }
  }

  public fastWrite(
    on: string,
    rowId: string,
    editorState: EditorState,
    blocksChanged: LexicalDiff[],
    hasDeletedNodes: boolean,
    originalPayload?: AnyData
  ) {
    if (blocksChanged.length === 0 && !hasDeletedNodes) return;
    space.addRow(E, {
      on,
      itemId: rowId,
      createdAt: Date.now(),
      json: hasDeletedNodes
        ? JSON.stringify(editorState.toJSON())
        : JSON.stringify(blocksChanged),
      isFullSnapshot: hasDeletedNodes,
      debugPayload: originalPayload
        ? JSON.stringify(originalPayload)
        : undefined
    });
    schedule.in(appConfig.FAST_WRITE_THROTTLE, TaskNames.FAST_WRITE, {
      on,
      rowId
    });
  }

  private reconcileEdits(
    edits: DocumentEdit[],
    content: SerializedEditorState
  ) {
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
    return JSON.stringify(content);
  }

  public reconcile(on: string, itemId: string, doClear = true) {
    const edits = this.getEdits(on, itemId);
    const content = this.reconcileEdits(
      edits,
      JSON.parse(this.getContent(on, itemId))
    );
    if (doClear) {
      space.transaction(() => {
        edits.forEach(e => space.delRow(E, e.id));
      });
    }
    return content;
  }

  public clear(on: string, itemId: string) {
    const edits = this.getEdits(on, itemId);
    space.transaction(() => {
      edits.forEach(e => space.delRow(E, e.id));
    });
  }

  public getContent(on: string, itemId: string) {
    return on === SpaceTables.Collection
      ? collectionService.getDocumentContent(itemId)
      : annotsService.getContent(itemId);
  }

  public getEdits(on: string, itemId: string): DocumentEdit[] {
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

  public writeContent(on: string, itemId: string, content: string) {
    if (on === SpaceTables.Collection) {
      collectionService.setItemField(itemId, 'content', content, false);
    } else {
      annotsService.edit(itemId, content);
    }
  }
}

export const writer = new DocumentWriterService();
