import { useExtensionSignalValue } from '@lexical/react/useExtensionSignalValue';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import { SelectionContextExtension } from './extensions/SelectionContextExtension';
import { ZoomExtension } from './extensions/ZoomExtension';
import { useGlobalReactContext } from './react/GlobalReactContext';

export const useIsEditable = () => {
  const isEditable = useLexicalEditable();
  const { globalEditable } = useGlobalReactContext();
  return { globalEditable, isEditable };
};

export function useSelectionContext() {
  return useExtensionSignalValue(SelectionContextExtension, 'selectionContext');
}

export function useCanZoomSignals() {
  const canZoomIn = useExtensionSignalValue(ZoomExtension, 'canZoomIn');
  const canZoomOut = useExtensionSignalValue(ZoomExtension, 'canZoomOut');
  return { canZoomIn, canZoomOut };
}
