import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import { createContext, ReactNode, use } from 'react';

type EditorContextSpec = {
  globalEditable: boolean;
};

const EditorContext = createContext<EditorContextSpec | undefined>(undefined);

export const EditorContextProvider = ({
  globalEditable = true,
  children
}: {
  globalEditable: boolean;
  readonly children?: ReactNode;
}) => {
  return (
    <EditorContext
      value={{
        globalEditable
      }}
    >
      {children}
    </EditorContext>
  );
};

export type EditorContextType = EditorContextSpec & { isEditable: boolean };

export type ReadOnlyEditorContext = EditorContextType;

export const useEditorContext = (): EditorContextType => {
  const context = use(EditorContext);
  const isEditable = useLexicalEditable();
  if (context === undefined) {
    throw new Error(
      'useEditorContext must be used within a EditorContextProvider'
    );
  }
  return { ...context, isEditable };
};
