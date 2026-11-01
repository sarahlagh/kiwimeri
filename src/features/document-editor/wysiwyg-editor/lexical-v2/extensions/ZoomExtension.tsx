import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ReactExtension } from '@lexical/react/ReactExtension';
import {
  COMMAND_PRIORITY_LOW,
  COMMAND_PRIORITY_NORMAL,
  configExtension,
  createCommand,
  defineExtension,
  KEY_DOWN_COMMAND,
  LexicalEditor,
  mergeRegister
} from 'lexical';
import { useEffect } from 'react';
import { useEditorContext } from '../EditorContext';

export const ZOOM_TO_COMMAND = createCommand<number>('ZOOM_TO_COMMAND');
export const ZOOM_IN_COMMAND = createCommand('ZOOM_IN_COMMAND');
export const ZOOM_OUT_COMMAND = createCommand('ZOOM_OUT_COMMAND');
export const ZOOM_RESET_COMMAND = createCommand('ZOOM_RESET_COMMAND');

export const ZOOM_INCREMENT = 0.05;
export const MAX_ZOOM = 3;

type StyleWithZoom = CSSStyleDeclaration & {
  zoom: string;
};

function zoomTo(
  zoom: number,
  editor: LexicalEditor,
  setZoomLevel: (zoomLevel: number) => void
) {
  const editorElement = editor.getRootElement();
  if (editorElement) {
    const style = editorElement.style as StyleWithZoom;
    style.zoom = `${zoom}`;
  }
  setZoomLevel(zoom);
  return false;
}

function ZoomExtensionWrapper() {
  const [editor] = useLexicalComposerContext();
  const { zoomLevel, setZoomLevel } = useEditorContext();

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        ZOOM_TO_COMMAND,
        zoom => zoomTo(zoom, editor, setZoomLevel),
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        ZOOM_IN_COMMAND,
        () => zoomTo(zoomLevel + ZOOM_INCREMENT, editor, setZoomLevel),
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        ZOOM_OUT_COMMAND,
        () => zoomTo(zoomLevel - ZOOM_INCREMENT, editor, setZoomLevel),
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        ZOOM_RESET_COMMAND,
        () => zoomTo(1, editor, setZoomLevel),
        COMMAND_PRIORITY_LOW
      )
    );
  }, [editor, zoomLevel, setZoomLevel]);

  useEffect(() => {
    // only want this once on editor load
    zoomTo(zoomLevel, editor, setZoomLevel);
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [editor]);

  return null;
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
      return editor.dispatchCommand(ZOOM_IN_COMMAND, ZOOM_INCREMENT);
    case '-':
      payload.preventDefault();
      return editor.dispatchCommand(ZOOM_OUT_COMMAND, ZOOM_INCREMENT);
    case '0':
      payload.preventDefault();
      return editor.dispatchCommand(ZOOM_RESET_COMMAND, undefined);
    default:
      return false;
  }
};

const ZoomExtension = defineExtension({
  name: '@kiwimeri/rich-text/zoom',
  namespace: 'react-rich',
  dependencies: [
    configExtension(ReactExtension, {
      decorators: [<ZoomExtensionWrapper key="" />]
    })
  ],
  register(editor) {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      payload => keyboardShortcutsHandler(payload, editor),
      COMMAND_PRIORITY_NORMAL
    );
  }
});

export default ZoomExtension;
