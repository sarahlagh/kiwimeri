import formatConverter from '@/domain/format-conversion/format-converter.service';
import type { SerializedEditorState } from 'lexical';

export function getPlainText(content?: string): string;
export function getPlainText(content: SerializedEditorState): string;

export function getPlainText(content?: SerializedEditorState | string) {
  if (!content) return '';
  const contentStr =
    typeof content === 'string' ? content : JSON.stringify(content);
  return formatConverter.toPlainText(contentStr, {
    inline: true
  });
}
