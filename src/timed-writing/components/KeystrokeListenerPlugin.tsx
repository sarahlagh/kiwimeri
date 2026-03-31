import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  COMMAND_PRIORITY_LOW,
  EditorState,
  INSERT_LINE_BREAK_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
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
  const [lastText, setLastText] = useState<string | null>(null);
  const [lastWasEnter, setLastWasEnter] = useState(false);
  const onWritingKeyRef = useRef(onWritingKey);

  useEffect(() => {
    onWritingKeyRef.current = onWritingKey;
  }, [onWritingKey]);

  useEffect(() => {
    // KEY DOWN not reliable on android
    // INPUT_COMMAND skips first insert of paragraph for some reason
    // so fallback on text listener
    // doesn't prevent pasting text but reliable everywhere
    // INSERT_PARAGRAPH_COMMAND and INSERT_LINE_BREAK_COMMAND work but... timing issue with text content listener?
    return mergeRegister(
      editor.registerCommand(
        INSERT_PARAGRAPH_COMMAND,
        () => {
          setLastWasEnter(true);
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        INSERT_LINE_BREAK_COMMAND,
        () => {
          setLastWasEnter(true);
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerTextContentListener(text => {
        const lastTextLength = lastText?.length || 0;
        if (lastTextLength < text.length && !lastWasEnter) {
          onWritingKeyRef.current(editor.getEditorState());
        }
        setLastText(text);
        setLastWasEnter(false);
      })
    );
  }, [editor, lastText, lastWasEnter]);
  return null;
};

export default KeystrokeListenerPlugin;
