import { RefObject } from 'react';
import {
  ReadOnlyEditorInstanceContext,
  useEditorInstanceContext
} from './EditorInstanceContext';

type EditorInstanceContextRefPluginProps = {
  contextRef: RefObject<ReadOnlyEditorInstanceContext | null>;
};

const EditorInstanceContextRefPlugin = ({
  contextRef
}: EditorInstanceContextRefPluginProps) => {
  const context = useEditorInstanceContext();
  if (!contextRef.current) {
    contextRef.current = {} as ReadOnlyEditorInstanceContext;
  }
  contextRef.current.globalEditable = context.globalEditable;
  contextRef.current.canRedo = context.canRedo;
  contextRef.current.canRedoLength = context.canRedoLength;
  contextRef.current.canUndo = context.canUndo;
  contextRef.current.canUndoLength = context.canUndoLength;
  return null;
};

export default EditorInstanceContextRefPlugin;
