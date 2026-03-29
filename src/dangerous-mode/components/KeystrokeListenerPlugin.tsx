import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  COMMAND_PRIORITY_LOW,
  EditorState,
  INPUT_COMMAND,
  KEY_DOWN_COMMAND,
  KEY_ENTER_COMMAND,
  mergeRegister
} from 'lexical';
import { useEffect, useRef, useState } from 'react';

type KeystrokeListenerPluginProps = {
  onWritingKey: (editorState: EditorState) => void;
};

const KeystrokeListenerPlugin = ({
  onWritingKey
}: KeystrokeListenerPluginProps) => {
  const [editor] = useLexicalComposerContext();
  const [caughtFirstChar, setCaughtFirstChar] = useState(false);
  const onWritingKeyRef = useRef(onWritingKey);

  useEffect(() => {
    onWritingKeyRef.current = onWritingKey;
  }, [onWritingKey]);

  useEffect(() => {
    if (caughtFirstChar) {
      return mergeRegister(
        editor.registerCommand(
          INPUT_COMMAND,
          (event: InputEvent) => {
            if (event.inputType === 'deleteContentBackward') return false;
            onWritingKeyRef.current(editor.getEditorState());
            return false;
          },
          COMMAND_PRIORITY_LOW
        ),
        editor.registerCommand(
          KEY_ENTER_COMMAND,
          () => {
            setCaughtFirstChar(false);
            return false;
          },
          COMMAND_PRIORITY_LOW
        )
      );
    }
    // INPUT_COMMAND skips first char for some reason so fallback on KEY_DOWN
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      event => {
        console.debug('received key down event', event);
        setCaughtFirstChar(true);
        onWritingKeyRef.current(editor.getEditorState());
        return false;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor, caughtFirstChar]);
  return null;
};

export default KeystrokeListenerPlugin;
