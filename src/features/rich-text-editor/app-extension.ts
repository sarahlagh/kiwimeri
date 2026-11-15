import { ClipboardDOMImportExtension } from '@lexical/clipboard';
import {
  AutoFocusExtension,
  ClickAfterLastBlockExtension,
  HMRExtension,
  HorizontalRuleExtension,
  SelectBlockExtension,
  SelectionAlwaysOnDisplayExtension,
  TabIndentationExtension
} from '@lexical/extension';
import { CheckListExtension, ListExtension } from '@lexical/list';
import { TreeViewExtension } from '@lexical/react/TreeViewExtension';
import { RichTextExtension } from '@lexical/rich-text';
import { configExtension, defineExtension } from 'lexical';
import { MarkdownShortcutsExtension as CustomMarkdownShortcutsExtension } from './extensions/MarkdownShortcutsExtension';
import { OnChangeExtension } from './extensions/OnChangeExtension';
import ReactLinkExtension from './extensions/ReactLinkExtension';
import RegisterCommandsExtension from './extensions/RegisterCommandsExtension';
import { SelectionContextExtension } from './extensions/SelectionContextExtension';
import { ZoomExtension } from './extensions/ZoomExtension';
import Theme from './theme/Theme';

const enableHMR = import.meta.hot && import.meta.env.TEST !== 'true';

export const appExtension = defineExtension({
  dependencies: [
    configExtension(HMRExtension, {
      hot: enableHMR ? import.meta.hot : null
    }),
    RichTextExtension,
    SelectBlockExtension,
    SelectionAlwaysOnDisplayExtension,
    HorizontalRuleExtension,
    ListExtension,
    CheckListExtension,
    ClipboardDOMImportExtension,
    AutoFocusExtension,
    ClickAfterLastBlockExtension,
    TabIndentationExtension,
    TreeViewExtension,
    // custom extensions
    SelectionContextExtension,
    RegisterCommandsExtension,
    OnChangeExtension,
    ZoomExtension,
    ReactLinkExtension,
    CustomMarkdownShortcutsExtension
  ],
  name: '@kiwimeri/rich-text',
  namespace: 'react-rich',
  theme: Theme
});
