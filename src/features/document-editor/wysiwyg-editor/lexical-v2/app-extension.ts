import { ClipboardDOMImportExtension } from '@lexical/clipboard';
import {
  AutoFocusExtension,
  ClickAfterLastBlockExtension,
  EditorStateExtension,
  HMRExtension,
  HorizontalRuleExtension,
  InitialStateExtension,
  SelectBlockExtension,
  SelectionAlwaysOnDisplayExtension,
  TabIndentationExtension
} from '@lexical/extension';
import { HistoryExtension } from '@lexical/history';
import { TreeViewExtension } from '@lexical/react/TreeViewExtension';
import { RichTextExtension } from '@lexical/rich-text';
import { configExtension, defineExtension } from 'lexical';
import Theme from './theme/Theme';

export const appExtension = defineExtension({
  dependencies: [
    configExtension(HMRExtension, { hot: import.meta.hot ?? null }),
    RichTextExtension,
    EditorStateExtension,
    HistoryExtension,
    SelectBlockExtension,
    SelectionAlwaysOnDisplayExtension,
    HorizontalRuleExtension,
    InitialStateExtension,
    ClipboardDOMImportExtension,
    AutoFocusExtension,
    ClickAfterLastBlockExtension,
    TabIndentationExtension,
    TreeViewExtension
  ],
  name: '@kiwimeri/rich-text',
  namespace: 'react-rich',
  theme: Theme
});
