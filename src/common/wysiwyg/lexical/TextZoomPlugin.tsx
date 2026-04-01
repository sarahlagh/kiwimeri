import storageService from '@/db/storage.service';
import { useStoreValueWithDefault } from '@/db/tinybase/hooks';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { COMMAND_PRIORITY_LOW, LexicalEditor, mergeRegister } from 'lexical';
import { useEffect } from 'react';
import {
  ZOOM_IN_COMMAND,
  ZOOM_OUT_COMMAND,
  ZOOM_RESET_COMMAND
} from './commands';

type StyleWithZoom = CSSStyleDeclaration & {
  zoom: string;
};

function zoomTo(zoom: number, editor: LexicalEditor) {
  storageService.getStore().setValue('globalZoom', zoom);
  const editorElement = editor.getRootElement();
  if (editorElement) {
    const style = editorElement.style as StyleWithZoom;
    style.zoom = `${zoom}`;
  }
  return false;
}

export default function TextZoomPlugin() {
  const [editor] = useLexicalComposerContext();
  const zoom = useStoreValueWithDefault<number>('globalZoom', 1);
  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        ZOOM_IN_COMMAND,
        increment => zoomTo(zoom + increment, editor),
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        ZOOM_OUT_COMMAND,
        increment => zoomTo(zoom - increment, editor),
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        ZOOM_RESET_COMMAND,
        () => zoomTo(1, editor),
        COMMAND_PRIORITY_LOW
      )
    );
  }, [editor, zoom]);

  return null;
}
