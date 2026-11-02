import { signal } from '@lexical/extension';
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

const ZOOM_INCREMENT = 0.05;
export const MAX_ZOOM = 3;
export const MIN_ZOOM = 0.5;

type StyleWithZoom = CSSStyleDeclaration & {
  zoom: string;
};

function zoomTo(
  zoom: number,
  editor: LexicalEditor,
  setZoomLevel: (zoomLevel: number, skipListener: boolean) => void,
  skipListener = false
) {
  if (MIN_ZOOM - ZOOM_INCREMENT >= zoom || zoom >= MAX_ZOOM + ZOOM_INCREMENT) {
    return false;
  }
  const editorElement = editor.getRootElement();
  if (editorElement) {
    const style = editorElement.style as StyleWithZoom;
    style.zoom = `${zoom}`;
  }
  setZoomLevel(zoom, skipListener);
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

type ZoomExtensionConfig = {
  initialZoom: number;
  onZoomChange?: (zoom: number) => void;
};

const initialConfig: ZoomExtensionConfig = { initialZoom: 1 };

export const ZoomExtension = defineExtension({
  name: '@kiwimeri/rich-text/zoom',
  namespace: 'react-rich',
  config: safeCast<ZoomExtensionConfig>(initialConfig),
  build(editor, config) {
    return { zoom: signal(config.initialZoom) };
  },
  register(editor, config, state) {
    const { zoom } = state.getOutput();
    const setZoomLevel = (value: number, skipListener: boolean) => {
      zoom.value = value;
      if (config.onZoomChange && !skipListener) config.onZoomChange(value);
    };
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
        () => zoomTo(1, editor, setZoomLevel),
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
