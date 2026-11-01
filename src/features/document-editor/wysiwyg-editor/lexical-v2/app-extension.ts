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
import { CheckListExtension, ListExtension } from '@lexical/list';
import { TreeViewExtension } from '@lexical/react/TreeViewExtension';
import { RichTextExtension } from '@lexical/rich-text';
import { configExtension, defineExtension } from 'lexical';
import CustomLinkExtension from './extensions/LinkExtension';
import RegisterCommandsExtension from './extensions/RegisterCommandsExtension';
import SetSelectionContextExtension from './extensions/SetSelectionContextExtension';
import ZoomExtension from './extensions/ZoomExtension';
import Theme from './theme/Theme';

export const appExtension = defineExtension({
  dependencies: [
    configExtension(HMRExtension, { hot: import.meta.hot ?? null }),
    RichTextExtension,
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
    // custom extensions
    RegisterCommandsExtension,
    SetSelectionContextExtension,
    CustomLinkExtension,
    ZoomExtension
  ],
  name: '@kiwimeri/rich-text',
  namespace: 'react-rich',
  theme: Theme
});
