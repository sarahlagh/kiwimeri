import { defineExtension, mergeRegister } from 'lexical';
import { registerFormatWordUnderCursorCommand } from '../commands/format-word-under-cursor-command';
import { registerRemoveFormatCommand } from '../commands/remove-format-command';

const RegisterCommandsExtension = defineExtension({
  name: '@kiwimeri/rich-text/register-commands',
  namespace: 'react-rich',
  register(editor) {
    return mergeRegister(
      registerFormatWordUnderCursorCommand(editor),
      registerRemoveFormatCommand(editor)
    );
  }
});

export default RegisterCommandsExtension;
