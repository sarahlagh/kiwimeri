import { signal } from '@lexical/extension';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ReactExtension } from '@lexical/react/ReactExtension';
import { useSignalValue } from '@lexical/react/useExtensionSignalValue';
import {
  COMMAND_PRIORITY_LOW,
  COMMAND_PRIORITY_NORMAL,
  createCommand,
  defineExtension,
  KEY_DOWN_COMMAND,
  LexicalEditor,
  mergeRegister
} from 'lexical';
import { useEffect } from 'react';

export const ZOOM_TO_COMMAND = createCommand<number>('ZOOM_TO_COMMAND');
export const ZOOM_IN_COMMAND = createCommand('ZOOM_IN_COMMAND');
export const ZOOM_OUT_COMMAND = createCommand('ZOOM_OUT_COMMAND');
export const ZOOM_RESET_COMMAND = createCommand('ZOOM_RESET_COMMAND');

const ZOOM_INCREMENT = 0.05;
export const MAX_ZOOM = 3;
export const MIN_ZOOM = 0.5;

const zoomSignal = signal(1);

type StyleWithZoom = CSSStyleDeclaration & {
  zoom: string;
};

function zoomTo(
  zoom: number,
  editor: LexicalEditor,
  setZoomLevel: (zoomLevel: number) => void
) {
  if (MIN_ZOOM - ZOOM_INCREMENT >= zoom || zoom >= MAX_ZOOM + ZOOM_INCREMENT) {
    return false;
  }
  const editorElement = editor.getRootElement();
  if (editorElement) {
    const style = editorElement.style as StyleWithZoom;
    style.zoom = `${zoom}`;
  }
  setZoomLevel(zoom);
  return false;
}

const keyboardShortcutsHandler = (
  payload: KeyboardEvent,
  editor: LexicalEditor
) => {
  if (!(payload.metaKey || payload.ctrlKey) || payload.altKey) {
    return false;
  }
  switch (payload.key.toLowerCase()) {
    case '=':
    case '+':
      payload.preventDefault();
      return editor.dispatchCommand(ZOOM_IN_COMMAND, null);
    case '-':
      payload.preventDefault();
      return editor.dispatchCommand(ZOOM_OUT_COMMAND, null);
    case '0':
      payload.preventDefault();
      return editor.dispatchCommand(ZOOM_RESET_COMMAND, null);
    default:
      return false;
  }
};

function ZoomExtensionWrapper({
  initialZoom,
  onZoomChange
}: {
  initialZoom?: number;
  onZoomChange?: (zoom: number) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const currentZoom = useSignalValue(zoomSignal);

  // on init, apply once
  useEffect(() => {
    if (initialZoom !== undefined) {
      editor.dispatchCommand(ZOOM_TO_COMMAND, initialZoom);
    }
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [editor]);

  // on change
  useEffect(() => {
    if (onZoomChange) onZoomChange(currentZoom);
  }, [onZoomChange, currentZoom]);

  return null;
}

export const ZoomExtension = defineExtension({
  name: '@kiwimeri/rich-text/zoom',
  namespace: 'react-rich',
  build() {
    return { zoomSignal, Component: ZoomExtensionWrapper };
  },
  dependencies: [ReactExtension],
  register(editor, config, state) {
    const { zoomSignal } = state.getOutput();
    const setZoomLevel = (zoom: number) => (zoomSignal.value = zoom);
    return mergeRegister(
      editor.registerCommand(
        ZOOM_TO_COMMAND,
        zoom => zoomTo(zoom, editor, setZoomLevel),
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        ZOOM_IN_COMMAND,
        () => zoomTo(zoomSignal.peek() + ZOOM_INCREMENT, editor, setZoomLevel),
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        ZOOM_OUT_COMMAND,
        () => zoomTo(zoomSignal.peek() - ZOOM_INCREMENT, editor, setZoomLevel),
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        ZOOM_RESET_COMMAND,
        () => zoomTo(1, editor, setZoomLevel),
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_DOWN_COMMAND,
        payload => keyboardShortcutsHandler(payload, editor),
        COMMAND_PRIORITY_NORMAL
      )
    );
  }
});
