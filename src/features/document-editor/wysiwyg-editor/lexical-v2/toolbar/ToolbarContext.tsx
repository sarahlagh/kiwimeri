import { ListType } from '@lexical/list';
import { HeadingTagType } from '@lexical/rich-text';
import { ElementFormatType } from 'lexical';
import { createContext, ReactNode, use, useCallback, useState } from 'react';

type ToolbarState = {
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

const INITIAL_TOOLBAR_STATE: ToolbarState = {
  isBold: false,
  isHighlight: false,
  isItalic: false,
  isStrikethrough: false,
  isUnderline: false,
  blockType: 'paragraph',
  elementFormat: 'left'
};

type ToolbarContextSpec = {
  toolbarState: ToolbarState;
  updateToolbarState<Key extends ToolbarStateKey>(
    key: Key,
    value: ToolbarStateValue<Key>
  ): void;
};

type ToolbarStateKey = keyof ToolbarState;
type ToolbarStateValue<Key extends ToolbarStateKey> = ToolbarState[Key];

const ToolbarContext = createContext<ToolbarContextSpec | undefined>(undefined);

export const ToolbarContextProvider = ({
  children
}: {
  readonly children?: ReactNode;
}) => {
  const [toolbarState, setToolbarState] = useState(INITIAL_TOOLBAR_STATE);
  const updateToolbarState = useCallback(
    <Key extends ToolbarStateKey>(key: Key, value: ToolbarStateValue<Key>) => {
      setToolbarState(prev => ({
        ...prev,
        [key]: value
      }));
    },
    []
  );
  return (
    <ToolbarContext value={{ toolbarState, updateToolbarState }}>
      {children}
    </ToolbarContext>
  );
};

export const useToolbarState = () => {
  const context = use(ToolbarContext);
  if (context === undefined) {
    throw new Error(
      'useToolbarContext must be used within a ToolbarContextProvider'
    );
  }
  return context;
};
