import { createContext, ReactNode, use, useReducer } from 'react';

type UpdatableGlobalReactContextSpec = {
  canUndo: boolean;
  canRedo: boolean;
  canUndoLength: number;
  canRedoLength: number;
};

type GlobalReactContextSpec = UpdatableGlobalReactContextSpec & {
  globalEditable: boolean;
  historyEnabled: boolean;
  updateContext: (update: UpdatableGlobalReactContextSpec) => void;
};

export type ReadOnlyGlobalReactContext = Omit<
  GlobalReactContextSpec,
  'updateContext'
>;

const INITIAL_CONTEXT: UpdatableGlobalReactContextSpec = {
  canRedo: false,
  canRedoLength: 0,
  canUndo: false,
  canUndoLength: 0
};

const GlobalReactContext = createContext<GlobalReactContextSpec | undefined>(
  undefined
);

export const GlobalReactContextProvider = ({
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
    INITIAL_CONTEXT
  );
  return (
    <GlobalReactContext
      value={{
        globalEditable,
        historyEnabled,
        ...globalContext,
        updateContext: dispatch
      }}
    >
      {children}
    </GlobalReactContext>
  );
};

export const useGlobalReactContext = (): GlobalReactContextSpec => {
  const context = use(GlobalReactContext);
  if (context === undefined) {
    throw new Error(
      'useGlobalReactContext must be used within a GlobalReactContextProvider'
    );
  }
  return context;
};
