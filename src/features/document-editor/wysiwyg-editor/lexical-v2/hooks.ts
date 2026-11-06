import { useExtensionSignalValue } from '@lexical/react/useExtensionSignalValue';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import { SelectionContextExtension } from './extensions/SelectionContextExtension';
import { ZoomExtension } from './extensions/ZoomExtension';
import { useGlobalReactContext } from './react/GlobalReactContext';

export const useIsEditable = () => {
  const isEditable = useLexicalEditable();
  const { globalEditable } = useGlobalReactContext();
  //   const globalEditable = useExtensionSignalValue(
  //     ReactReloadConfigExtension,
  //     'globalEditable'
  //   );
  return { globalEditable, isEditable };
};

export function useSelectionContext() {
  return useExtensionSignalValue(SelectionContextExtension, 'selectionContext');
}

export function useCanUndoRedo() {
  const { canRedo, canUndo } = useGlobalReactContext();
  //   const historyState = useExtensionSignalValue(
  //     ReactReloadConfigExtension,
  //     'historyState'
  //   );
  //   const canRedo = historyState && historyState.redoStack.length > 0;
  //   const canUndo = historyState && historyState.undoStack.length > 0;
  //   console.debug('historyState', historyState, canRedo, canUndo);
  return { canRedo, canUndo };
}

export function useCanZoomSignals() {
  const canZoomIn = useExtensionSignalValue(ZoomExtension, 'canZoomIn');
  const canZoomOut = useExtensionSignalValue(ZoomExtension, 'canZoomOut');
  return { canZoomIn, canZoomOut };
}
