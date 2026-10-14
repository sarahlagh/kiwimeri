import { ClipboardDOMImportExtension } from '@lexical/clipboard';
import {
  AutoFocusExtension,
  ClickAfterLastBlockExtension,
  HMRExtension,
  HorizontalRuleExtension,
  InitialStateExtension,
  SelectBlockExtension,
  SelectionAlwaysOnDisplayExtension,
  TabIndentationExtension
} from '@lexical/extension';
import { HistoryExtension } from '@lexical/history';
import { CheckListExtension, ListExtension } from '@lexical/list';
import { TreeViewExtension } from '@lexical/react/TreeViewExtension';
import { RichTextExtension } from '@lexical/rich-text';
import { configExtension, defineExtension } from 'lexical';
import SetSelectionContextExtension from './extensions/SetSelectionContextExtension';
import Theme from './theme/Theme';

export const appExtension = defineExtension({
  dependencies: [
    configExtension(HMRExtension, { hot: import.meta.hot ?? null }),
    RichTextExtension,
    HistoryExtension,
    SelectBlockExtension,
    SelectionAlwaysOnDisplayExtension,
    HorizontalRuleExtension,
    ListExtension,
    CheckListExtension,
    InitialStateExtension,
    ClipboardDOMImportExtension,
    AutoFocusExtension,
    ClickAfterLastBlockExtension,
    TabIndentationExtension,
    TreeViewExtension,
    SetSelectionContextExtension
  ],
  name: '@kiwimeri/rich-text',
  namespace: 'react-rich',
  theme: Theme
});
