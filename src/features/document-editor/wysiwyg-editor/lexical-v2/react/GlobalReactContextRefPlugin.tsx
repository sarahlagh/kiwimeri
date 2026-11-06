import { RefObject } from 'react';
import {
  ReadOnlyGlobalReactContext,
  useGlobalReactContext
} from './GlobalReactContext';

type GlobalReactContextRefPluginProps = {
  contextRef: RefObject<ReadOnlyGlobalReactContext | null>;
};

const GlobalReactContextRefPlugin = ({
  contextRef
}: GlobalReactContextRefPluginProps) => {
  const context = useGlobalReactContext();
  if (!contextRef.current) {
    contextRef.current = {} as ReadOnlyGlobalReactContext;
  }
  contextRef.current.globalEditable = context.globalEditable;
  contextRef.current.canRedo = context.canRedo;
  contextRef.current.canRedoLength = context.canRedoLength;
  contextRef.current.canUndo = context.canUndo;
  contextRef.current.canUndoLength = context.canUndoLength;
  return null;
};

export default GlobalReactContextRefPlugin;
