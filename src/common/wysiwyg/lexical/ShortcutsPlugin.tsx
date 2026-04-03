import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    COMMAND_PRIORITY_NORMAL,
    FORMAT_TEXT_COMMAND,
    KEY_DOWN_COMMAND
} from 'lexical';
import { useEffect } from 'react';
import {
    ZOOM_IN_COMMAND,
    ZOOM_OUT_COMMAND,
    ZOOM_RESET_COMMAND
} from './commands';
import { ZOOM_INCREMENT } from './constants';


export default function ShortcutsPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    const keyboardShortcutsHandler = (payload: KeyboardEvent) => {
      if (!(payload.metaKey || payload.ctrlKey) || payload.altKey) {
        return false;
      }

      switch (payload.key.toLowerCase()) {
        case 'b':
          payload.preventDefault();
          return editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
        case 'i':
          payload.preventDefault();
          return editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
        case 'u':
          payload.preventDefault();
          return editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
        case 's':
          payload.preventDefault();
          return editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
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

    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      keyboardShortcutsHandler,
      COMMAND_PRIORITY_NORMAL
    );
  }, [editor]);

  return null;
}
