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
import ReactLinkExtension from './extensions/ReactLinkExtension';
import { ReactSearchExtension } from './extensions/ReactSearchExtension';
import RegisterCommandsExtension from './extensions/RegisterCommandsExtension';
import { SelectionContextExtension } from './extensions/SelectionContextExtension';
import { ZoomExtension } from './extensions/ZoomExtension';
import Theme from './theme/Theme';

export type AppExtensionConfig = {
  globalEditable?: boolean;
  initialZoom?: number;
  onZoomChange?: (zoomLevel: number) => void;
};

const enableHMR = import.meta.hot && import.meta.env.TEST !== 'true';

export const buildAppExtension = (config: AppExtensionConfig) =>
  defineExtension({
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
      configExtension(ZoomExtension, {
        initialZoom: config.initialZoom,
        onZoomChange: config.onZoomChange
      }),
      ReactLinkExtension,
      ReactSearchExtension,
      CustomMarkdownShortcutsExtension
    ],
    name: '@kiwimeri/rich-text',
    namespace: 'react-rich',
    theme: Theme
  });
