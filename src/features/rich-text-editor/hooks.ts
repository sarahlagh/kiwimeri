import { useExtensionSignalValue } from '@lexical/react/useExtensionSignalValue';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import { SelectionContextExtension } from './extensions/SelectionContextExtension';
import { ZoomExtension } from './extensions/ZoomExtension';
import { useEditorInstanceContext } from './react/EditorInstanceContext';

export const useIsEditable = () => {
  const isEditable = useLexicalEditable();
  const { globalEditable } = useEditorInstanceContext();
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
