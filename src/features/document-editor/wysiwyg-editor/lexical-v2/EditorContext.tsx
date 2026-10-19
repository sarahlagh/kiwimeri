import { ListType } from '@lexical/list';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import { HeadingTagType } from '@lexical/rich-text';
import { ElementFormatType } from 'lexical';
import { createContext, ReactNode, use, useCallback, useState } from 'react';

type SelectionContext = {
  isTextOrElementSelection: boolean; // not just a cursor
  isBold: boolean;
  isItalic: boolean;
  isStrikethrough: boolean;
  isUnderline: boolean;
  isHighlight: boolean;
  blockType: string;
  headingTag?: HeadingTagType;
  listType?: ListType;
  elementFormat: ElementFormatType; // text-align
  links: {
    isLink: boolean;
    isAutoLink: boolean;
    isAutoLinkUnlinked: boolean;
    linkUrl?: string;
    linkText?: string;
    hasMultipleLinks: boolean;
  };
};

const INITIAL_SELECTION_CONTEXT: SelectionContext = {
  isTextOrElementSelection: false,
  isBold: false,
  isHighlight: false,
  isItalic: false,
  isStrikethrough: false,
  isUnderline: false,
  blockType: 'paragraph',
  elementFormat: 'left',
  links: {
    isLink: false,
    isAutoLink: false,
    isAutoLinkUnlinked: false,
    hasMultipleLinks: false
  }
};

type SelectionContextKey = keyof SelectionContext;
type SelectionContextValue<Key extends SelectionContextKey> =
  SelectionContext[Key];

type EditorContextSpec = {
  globalEditable: boolean;
  selectionContext: SelectionContext;
  setSelectionContext: (selectionContext: SelectionContext) => void;
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
      setSelectionContext(prev => ({ ...prev, [key]: value }));
    },
    []
  );
  return (
    <EditorContext
      value={{
        globalEditable,
        selectionContext,
        setSelectionContext,
        updateSelectionContext
      }}
    >
      {children}
    </EditorContext>
  );
};

export type EditorContextType = EditorContextSpec & { isEditable: boolean };

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

export function newInitialSelectionContext() {
  return structuredClone(INITIAL_SELECTION_CONTEXT);
}
