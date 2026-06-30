import { INITIAL_CONTENT_START } from '@/db_to_migrate/collection.service';
import { unminimizeContentFromStorage } from '@/domain/collection/compress-file-content';
import formatConverter from '@/domain/format-conversion/format-converter.service';
import { SerializedEditorState } from 'lexical';

export function getPlainText(content?: string): string;
export function getPlainText(content: SerializedEditorState): string;

export function getPlainText(content?: SerializedEditorState | string) {
  if (!content) return '';
  let contentStr =
    typeof content === 'string' ? content : JSON.stringify(content);
  if (!contentStr.startsWith(INITIAL_CONTENT_START)) {
    contentStr = unminimizeContentFromStorage(contentStr);
  }
  return formatConverter.toPlainText(contentStr, {
    inline: true
  });
}
