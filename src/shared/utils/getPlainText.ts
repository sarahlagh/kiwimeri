import formatConverter from '@/format-conversion/format-converter.service';
import { SerializedEditorState } from 'lexical';

export function getPlainText(content: SerializedEditorState) {
  return formatConverter.toPlainText(JSON.stringify(content), {
    inline: true
  });
}
