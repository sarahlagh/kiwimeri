import formatConverter from '@/format-conversion/format-converter.service';
import { SerializedEditorState } from 'lexical';

export function getPlainText(content: string): string;
export function getPlainText(content: SerializedEditorState): string;

export function getPlainText(content: SerializedEditorState | string) {
  const contentStr =
    typeof content === 'string' ? content : JSON.stringify(content);
  return formatConverter.toPlainText(contentStr, {
    inline: true
  });
}
