/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * imported from lexical source; modified to include skipTags, isSelectionChange var as output
 */

import type { UpdateListenerPayload } from 'lexical';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HISTORY_MERGE_TAG } from 'lexical';
import { useLayoutEffect } from 'react';

export function KiwimeriOnChangePlugin({
  skipTags = [],
  ignoreHistoryMergeTagChange = true,
  ignoreSelectionChange = false,
  onChange
}: {
  skipTags?: string[];
  ignoreHistoryMergeTagChange?: boolean;
  ignoreSelectionChange?: boolean;
  onChange: (
    change: UpdateListenerPayload & {
    isSelectionChange: boolean;
    }
  ) => void;
}): null {
  const [editor] = useLexicalComposerContext();

  useLayoutEffect(() => {
    const skipTagsSet = new Set<string>(skipTags);
    if (onChange) {
      return editor.registerUpdateListener(payload => {
        const { dirtyElements, dirtyLeaves, prevEditorState, tags } = payload;
          const isSelectionChange =
            dirtyElements.size === 0 && dirtyLeaves.size === 0;
          if (
            (ignoreSelectionChange && isSelectionChange) ||
            (ignoreHistoryMergeTagChange && tags.has(HISTORY_MERGE_TAG)) ||
            prevEditorState.isEmpty()
          ) {
            return;
          }

          if (!tags.isDisjointFrom(skipTagsSet)) {
            return;
          }

        onChange({ ...payload, isSelectionChange, tags });
    }
  }, [
    editor,
    ignoreHistoryMergeTagChange,
    ignoreSelectionChange,
    skipTags,
    onChange
  ]);

  return null;
}
