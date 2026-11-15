import { batch, effect, namedSignals } from '@lexical/extension';
import { useExtensionDependency } from '@lexical/react/useExtensionComponent';
import {
  defineExtension,
  HISTORY_MERGE_TAG,
  safeCast,
  UpdateListenerPayload
} from 'lexical';
import { useLayoutEffect } from 'react';
import { FOCUS_TAG, RELOAD_TAG } from '../constants';
import { mergeConfig, noop } from './utils';

export type OnChangePluginPayload = UpdateListenerPayload & {
  isSelectionChange: boolean;
};

type OnChangePluginProps = {
  ignoreHistoryMergeTagChange?: boolean;
  ignoreSelectionChange?: boolean;
  onChange: (change: OnChangePluginPayload) => void;
};
const INITIAL_CONFIG: Required<OnChangePluginProps> = {
  ignoreHistoryMergeTagChange: true,
  ignoreSelectionChange: true,
  onChange: noop
};

const skipTagsSet = new Set<string>([FOCUS_TAG, RELOAD_TAG]);

export const OnChangeExtension = defineExtension({
  name: '@kiwimeri/rich-text/on-change',
  namespace: 'react-rich',
  config: safeCast<Required<OnChangePluginProps>>(INITIAL_CONFIG),
  build(editor, config) {
    return namedSignals(mergeConfig(INITIAL_CONFIG, config));
  },
  register(editor, config, state) {
    const { ignoreSelectionChange, ignoreHistoryMergeTagChange, onChange } =
      state.getOutput();
    return effect(() =>
      editor.registerUpdateListener(payload => {
        const { dirtyElements, dirtyLeaves, prevEditorState, tags } = payload;
        const isSelectionChange =
          dirtyElements.size === 0 && dirtyLeaves.size === 0;
        if (
          (ignoreSelectionChange.value && isSelectionChange) ||
          (ignoreHistoryMergeTagChange.value && tags.has(HISTORY_MERGE_TAG)) ||
          prevEditorState.isEmpty() ||
          !tags.isDisjointFrom(skipTagsSet)
        ) {
          return;
        }

        onChange.value({ ...payload, isSelectionChange, tags });
      })
    );
  }
});

export const OnChangeExtensionPropsBridge = (props: OnChangePluginProps) => {
  const { output } = useExtensionDependency(OnChangeExtension);
  const mergedConfig = mergeConfig(
    INITIAL_CONFIG,
    props
  ) as Required<OnChangePluginProps>;

  useLayoutEffect(() => {
    batch(() => {
      output.ignoreSelectionChange.value = mergedConfig.ignoreSelectionChange;
      output.ignoreHistoryMergeTagChange.value =
        mergedConfig.ignoreHistoryMergeTagChange;
      output.onChange.value = mergedConfig.onChange;
    });
  }, [output, mergedConfig]);

  return null;
};
