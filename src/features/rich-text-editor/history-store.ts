import { createEmptyHistoryState, HistoryState } from '@lexical/history';
import { LexicalEditor } from 'lexical';

class LexicalHistoryStore {
  private store = new Map<
    string,
    { instanceType: string; historyState: HistoryState }
  >();

  public applyNewEditor(editor: LexicalEditor, instanceType: string) {
    this.store
      .values()
      .filter(v => v.instanceType === instanceType)
      .map(v => v.historyState)
      .forEach(historyState => {
        if (historyState.current) {
          historyState.current.editor = editor;
        }
        historyState.redoStack.forEach(entry => (entry.editor = editor));
        historyState.undoStack.forEach(entry => (entry.editor = editor));
      });
  }

  public get(historyId: string, instanceType: string): HistoryState {
    if (!this.store.has(historyId)) {
      this.store.set(historyId, {
        instanceType,
        historyState: createEmptyHistoryState()
      });
    }
    return this.store.get(historyId)!.historyState;
  }

  // for tests
  public clear() {
    this.store.clear();
  }
}

export const historyStore = new LexicalHistoryStore();
