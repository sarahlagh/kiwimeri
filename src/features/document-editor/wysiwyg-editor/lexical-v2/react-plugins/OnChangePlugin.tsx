import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HISTORY_MERGE_TAG, UpdateListenerPayload } from 'lexical';
import { RefObject, useEffect, useLayoutEffect } from 'react';
import { FOCUS_TAG, RELOAD_TAG } from '../constants';
import { useEditorContext } from '../EditorContext';

export type OnChangePluginPayload = UpdateListenerPayload & {
  isSelectionChange: boolean;
};

type OnChangePluginProps = {
  isReloadingRef: RefObject<boolean>;
  ignoreHistoryMergeTagChange?: boolean;
  ignoreSelectionChange?: boolean;
  onChange: (change: OnChangePluginPayload) => void;
  onZoomChange?: (zoomLevel: number) => void;
};

const skipTagsSet = new Set<string>([FOCUS_TAG, RELOAD_TAG]);

export default function OnChangePlugin(data: OnChangePluginProps) {
  const [editor] = useLexicalComposerContext();
  const { zoomLevel } = useEditorContext();
  const onZoomChange = data.onZoomChange;

  // onChange
  useLayoutEffect(() => {
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
        return;
      }

      if (data.onChange) data.onChange({ ...payload, isSelectionChange, tags });
    });
  }, [editor, data]);

  useEffect(() => {
    if (onZoomChange) onZoomChange(zoomLevel);
  }, [onZoomChange, zoomLevel]);

  return null;
}
