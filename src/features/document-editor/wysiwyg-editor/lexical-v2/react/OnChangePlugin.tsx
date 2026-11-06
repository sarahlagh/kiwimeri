import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HISTORY_MERGE_TAG, UpdateListenerPayload } from 'lexical';
import { RefObject, useLayoutEffect } from 'react';
import { FOCUS_TAG, RELOAD_TAG } from '../constants';

export type OnChangePluginPayload = UpdateListenerPayload & {
  isSelectionChange: boolean;
};

type OnChangePluginProps = {
  isReloadingRef: RefObject<boolean>;
  enabled?: boolean;
  ignoreHistoryMergeTagChange?: boolean;
  ignoreSelectionChange?: boolean;
  onChange: (change: OnChangePluginPayload) => void;
};

const skipTagsSet = new Set<string>([FOCUS_TAG, RELOAD_TAG]);

// TODO move to extension
export default function OnChangePlugin(data: OnChangePluginProps) {
  const [editor] = useLexicalComposerContext();

  // onChange
  useLayoutEffect(() => {
    if (data.enabled === false) return;
    return editor.registerUpdateListener(payload => {
      const { dirtyElements, dirtyLeaves, prevEditorState, tags } = payload;
      const isSelectionChange =
        dirtyElements.size === 0 && dirtyLeaves.size === 0;
      if (
        (data.ignoreSelectionChange && isSelectionChange) ||
        (data.ignoreHistoryMergeTagChange && tags.has(HISTORY_MERGE_TAG)) ||
        prevEditorState.isEmpty() ||
        !tags.isDisjointFrom(skipTagsSet) ||
        data.isReloadingRef.current
      ) {
        console.debug('[ONCHANGE] ignored event', tags);
        return;
      }

      console.debug('[ONCHANGE] got event');
      if (data.onChange) data.onChange({ ...payload, isSelectionChange, tags });
    });
  }, [editor, data]);

  return null;
}
