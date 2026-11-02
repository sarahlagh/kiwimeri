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
import { HistoryExtension as CustomHistoryExtension } from './extensions/HistoryExtension';
import CustomLinkExtension from './extensions/LinkExtension';
import { MarkdownShortcutsExtension } from './extensions/MarkdownShortcutsExtension';
import RegisterCommandsExtension from './extensions/RegisterCommandsExtension';
import { SearchExtension } from './extensions/SearchExtension';
import SetSelectionContextExtension from './extensions/SetSelectionContextExtension';
import { ZoomExtension } from './extensions/ZoomExtension';
import Theme from './theme/Theme';

export type AppExtensionConfig = {
  enableHistory?: boolean;
  historyId?: string;
  initialZoom?: number;
  onZoomChange?: (zoomLevel: number) => void;
};

export const buildAppExtension = (config: AppExtensionConfig) =>
  defineExtension({
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
      SetSelectionContextExtension,
      configExtension(CustomHistoryExtension, {
        enabled: config.enableHistory,
        historyId: config.historyId
      }),
      RegisterCommandsExtension,
      configExtension(ZoomExtension, {
        initialZoom: config.initialZoom,
        onZoomChange: config.onZoomChange
      }),
      CustomLinkExtension,
      SearchExtension,
      MarkdownShortcutsExtension
    ],
    name: '@kiwimeri/rich-text',
    namespace: 'react-rich',
    theme: Theme
  });
