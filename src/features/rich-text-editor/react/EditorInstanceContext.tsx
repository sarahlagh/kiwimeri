import { createContext, ReactNode, use, useReducer } from 'react';

type UpdatableEditorInstanceContextSpec = {
  canUndo: boolean;
  canRedo: boolean;
  canUndoLength: number;
  canRedoLength: number;
};

type EditorInstanceContextSpec = UpdatableEditorInstanceContextSpec & {
  globalEditable: boolean;
  historyEnabled: boolean;
  updateContext: (update: UpdatableEditorInstanceContextSpec) => void;
};

export type ReadOnlyEditorInstanceContext = Omit<
  EditorInstanceContextSpec,
  'updateContext'
>;

const INITIAL_CONTEXT: UpdatableEditorInstanceContextSpec = {
  canRedo: false,
  canRedoLength: 0,
  canUndo: false,
  canUndoLength: 0
};

const EditorInstanceContext = createContext<
  EditorInstanceContextSpec | undefined
>(undefined);

export const EditorInstanceContextProvider = ({
  globalEditable = true,
  historyEnabled = true,
  children
}: {
  globalEditable: boolean;
  historyEnabled: boolean;
  readonly children?: ReactNode;
}) => {
  const [globalContext, dispatch] = useReducer(
    (state, action) => ({ ...state, ...action }),
    { ...INITIAL_CONTEXT }
  );
  return (
    <EditorInstanceContext
      value={{
        globalEditable,
        historyEnabled,
        ...globalContext,
        updateContext: dispatch
      }}
    >
      {children}
    </EditorInstanceContext>
  );
};

export const useEditorInstanceContext = (): EditorInstanceContextSpec => {
  const context = use(EditorInstanceContext);
  if (context === undefined) {
    throw new Error(
      'useEditorInstanceContext must be used within a EditorInstanceContextProvider'
    );
  }
  return context;
};
