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
import { HistoryExtension as CustomHistoryExtension } from './extensions/HistoryExtension2';
import CustomLinkExtension from './extensions/LinkExtension';
import { MarkdownShortcutsExtension as CustomMarkdownShortcutsExtension } from './extensions/MarkdownShortcutsExtension';
import RegisterCommandsExtension from './extensions/RegisterCommandsExtension';
import { ReloadConfigExtension } from './extensions/ReloadConfigExtension';
import { SearchExtension } from './extensions/SearchExtension';
import { SelectionContextExtension } from './extensions/SelectionContextExtension';
import { ZoomExtension } from './extensions/ZoomExtension';
import Theme from './theme/Theme';
import { RichTextEditorInitialData } from './types';

export type AppExtensionConfig = {
  enableHistory?: boolean;
  initialZoom?: number;
  onZoomChange?: (zoomLevel: number) => void;
} & RichTextEditorInitialData;

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
      configExtension(ReloadConfigExtension, config),
      configExtension(CustomHistoryExtension, {
        enabled: config.enableHistory,
        historyId: config.historyId
      }),
      SelectionContextExtension,
      RegisterCommandsExtension,
      configExtension(ZoomExtension, {
        initialZoom: config.initialZoom,
        onZoomChange: config.onZoomChange
      }),
      CustomLinkExtension,
      SearchExtension,
      CustomMarkdownShortcutsExtension
    ],
    name: '@kiwimeri/rich-text',
    namespace: 'react-rich',
    theme: Theme
  });
