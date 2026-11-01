import { RefObject } from 'react';
import { ReadOnlyEditorContext, useEditorContext } from '../EditorContext';

type EditorContextRefPluginProps = {
  contextRef: RefObject<ReadOnlyEditorContext | null>;
};

const EditorContextRefPlugin = ({
  contextRef
}: EditorContextRefPluginProps) => {
  const context = useEditorContext();
  if (!contextRef.current) {
    contextRef.current = {} as ReadOnlyEditorContext;
  }
  contextRef.current.globalEditable = context.globalEditable;
  contextRef.current.isEditable = context.isEditable;
  contextRef.current.selectionContext = context.selectionContext;
  contextRef.current.historyState = context.historyState;
  contextRef.current.zoomLevel = context.zoomLevel;
  return null;
};

export default EditorContextRefPlugin;
