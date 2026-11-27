import { RefObject, useEffect } from 'react';
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
  useEffect(() => {
    if (!contextRef.current) {
      contextRef.current = {} as ReadOnlyEditorInstanceContext;
    }
    contextRef.current.globalEditable = context.globalEditable;
    contextRef.current.canRedo = context.canRedo;
    contextRef.current.canRedoLength = context.canRedoLength;
    contextRef.current.canUndo = context.canUndo;
    contextRef.current.canUndoLength = context.canUndoLength;
  }, [context, contextRef]);
  return null;
};

export default EditorInstanceContextRefPlugin;
