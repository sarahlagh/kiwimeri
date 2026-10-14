import { ListType } from '@lexical/list';
import { HeadingTagType } from '@lexical/rich-text';
import { ElementFormatType } from 'lexical';
import { createContext, ReactNode, use, useCallback, useState } from 'react';

type SelectionContext = {
  isBold: boolean;
  isItalic: boolean;
  isStrikethrough: boolean;
  isUnderline: boolean;
  isHighlight: boolean;
  blockType: string;
  headingTag?: HeadingTagType;
  listType?: ListType;
  elementFormat: ElementFormatType; // text-align
};

const INITIAL_SELECTION_CONTEXT: SelectionContext = {
  isBold: false,
  isHighlight: false,
  isItalic: false,
  isStrikethrough: false,
  isUnderline: false,
  blockType: 'paragraph',
  elementFormat: 'left'
};

type SelectionContextKey = keyof SelectionContext;
type SelectionContextValue<Key extends SelectionContextKey> =
  SelectionContext[Key];

type EditorContextSpec = {
  globalEditable: boolean;
  selectionContext: SelectionContext;
  updateSelectionContext<Key extends SelectionContextKey>(
    key: Key,
    value: SelectionContextValue<Key>
  ): void;
};

const EditorContext = createContext<EditorContextSpec | undefined>(undefined);

export const EditorContextProvider = ({
  globalEditable = true,
  children
}: {
  globalEditable: boolean;
  readonly children?: ReactNode;
}) => {
  const [selectionContext, setSelectionContext] = useState(
    INITIAL_SELECTION_CONTEXT
  );

  const updateSelectionContext = useCallback(
    <Key extends SelectionContextKey>(
      key: Key,
      value: SelectionContextValue<Key>
    ) => {
      setSelectionContext(prev => ({
        ...prev,
        [key]: value
      }));
    },
    []
  );
  return (
    <EditorContext
      value={{ globalEditable, selectionContext, updateSelectionContext }}
    >
      {children}
    </EditorContext>
  );
};

export const useEditorContext = () => {
  const context = use(EditorContext);
  if (context === undefined) {
    throw new Error(
      'useEditorContext must be used within a EditorContextProvider'
    );
  }
  return context;
};
