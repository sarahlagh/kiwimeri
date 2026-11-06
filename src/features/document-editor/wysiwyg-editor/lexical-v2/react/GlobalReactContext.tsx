import { createContext, ReactNode, use, useReducer } from 'react';

type UpdatableGlobalReactContextSpec = {
  canUndo: boolean;
  canRedo: boolean;
  canUndoLength: number;
  canRedoLength: number;
};

type GlobalReactContextSpec = UpdatableGlobalReactContextSpec & {
  globalEditable: boolean;
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
  children
}: {
  globalEditable: boolean;
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
