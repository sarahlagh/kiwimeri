import { defineExtension, mergeRegister } from 'lexical';
import { registerRemoveFormatCommand } from '../commands/remove-format-command';
import {
  registerFormatWordUnderCursorCommand,
  registerLinkAtWordUnderCursorCommand
} from '../commands/word-under-cursor-commands';

const RegisterCommandsExtension = defineExtension({
  name: '@kiwimeri/rich-text/register-commands',
  namespace: 'react-rich',
  register(editor) {
    return mergeRegister(
      registerFormatWordUnderCursorCommand(editor),
      registerRemoveFormatCommand(editor),
      registerLinkAtWordUnderCursorCommand(editor)
    );
  }
});

export default RegisterCommandsExtension;
