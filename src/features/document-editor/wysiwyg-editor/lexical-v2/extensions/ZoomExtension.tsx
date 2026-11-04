import { batch, signal } from '@lexical/extension';
import { useExtensionSignalValue } from '@lexical/react/useExtensionSignalValue';
import {
  COMMAND_PRIORITY_LOW,
  COMMAND_PRIORITY_NORMAL,
  createCommand,
  defineExtension,
  KEY_DOWN_COMMAND,
  LexicalEditor,
  mergeRegister,
  safeCast
} from 'lexical';

export const ZOOM_TO_COMMAND = createCommand<
  number | { zoom: number; isInitialZoom: true }
>('ZOOM_TO_COMMAND');
export const ZOOM_IN_COMMAND = createCommand('ZOOM_IN_COMMAND');
export const ZOOM_OUT_COMMAND = createCommand('ZOOM_OUT_COMMAND');
export const ZOOM_RESET_COMMAND = createCommand('ZOOM_RESET_COMMAND');

const ZOOM_INCREMENT = 5;
const MAX_ZOOM = 300;
const MIN_ZOOM = 50;

type StyleWithZoom = CSSStyleDeclaration & {
  zoom: string;
};

function zoomTo(
  zoom: number,
  editor: LexicalEditor,
  setZoomLevel: (zoomLevel: number, skipListener: boolean) => void,
  skipListener = false
) {
  if (MIN_ZOOM > zoom || zoom > MAX_ZOOM) {
    return false;
  }
  const editorElement = editor.getRootElement();
  if (editorElement) {
    const style = editorElement.style as StyleWithZoom;
    style.zoom = `${zoom / 100}`;
  }
  setZoomLevel(zoom, skipListener);
  return false;
}

const keyboardShortcutsHandler = (
  payload: KeyboardEvent,
  editor: LexicalEditor
) => {
  if (!payload.metaKey) return false;
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

type ZoomExtensionConfig = {
  initialZoom: number;
  onZoomChange?: (zoom: number) => void;
};

const initialConfig: ZoomExtensionConfig = { initialZoom: 100 };

function canZoomInZoomOut(value: number) {
  const canZoomIn = value < MAX_ZOOM;
  const canZoomOut = value > MIN_ZOOM;
  return { canZoomIn, canZoomOut };
}

export const ZoomExtension = defineExtension({
  name: '@kiwimeri/rich-text/zoom',
  namespace: 'react-rich',
  config: safeCast<ZoomExtensionConfig>(initialConfig),
  build(editor, config) {
    const { canZoomIn: initialCanZoomIn, canZoomOut: initialCanZoomOut } =
      canZoomInZoomOut(config.initialZoom);
    const canZoomIn = signal(initialCanZoomIn);
    const canZoomOut = signal(initialCanZoomOut);
    return { zoom: signal(config.initialZoom), canZoomIn, canZoomOut };
  },
  register(editor, config, state) {
    const { zoom, canZoomIn, canZoomOut } = state.getOutput();
    const setZoomLevel = (value: number, skipListener: boolean) =>
      batch(() => {
        const { canZoomIn: canZoomInValue, canZoomOut: canZoomOutValue } =
          canZoomInZoomOut(value);
        zoom.value = value;
        canZoomIn.value = canZoomInValue;
        canZoomOut.value = canZoomOutValue;
        if (config.onZoomChange && !skipListener) config.onZoomChange(value);
      });
    return mergeRegister(
      editor.registerCommand(
        ZOOM_TO_COMMAND,
        zoom => {
          if (typeof zoom === 'number') {
            return zoomTo(zoom, editor, setZoomLevel);
          }
          return zoomTo(zoom.zoom, editor, setZoomLevel, true); // on init skip onZoomChange
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        ZOOM_IN_COMMAND,
        () => zoomTo(zoom.peek() + ZOOM_INCREMENT, editor, setZoomLevel),
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        ZOOM_OUT_COMMAND,
        () => zoomTo(zoom.peek() - ZOOM_INCREMENT, editor, setZoomLevel),
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        ZOOM_RESET_COMMAND,
        () => zoomTo(100, editor, setZoomLevel),
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_DOWN_COMMAND,
        payload => keyboardShortcutsHandler(payload, editor),
        COMMAND_PRIORITY_NORMAL
      )
    );
  },
  afterRegistration(editor, config) {
    return editor.registerRootListener(rootElement => {
      if (rootElement !== null) {
        editor.dispatchCommand(ZOOM_TO_COMMAND, {
          zoom: config.initialZoom,
          isInitialZoom: true
        });
      }
    });
  }
});

export function useCanZoomSignals() {
  const canZoomIn = useExtensionSignalValue(ZoomExtension, 'canZoomIn');
  const canZoomOut = useExtensionSignalValue(ZoomExtension, 'canZoomOut');
  return { canZoomIn, canZoomOut };
}
