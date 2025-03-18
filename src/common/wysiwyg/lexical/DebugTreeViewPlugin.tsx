/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { useState, type JSX } from 'react';

import { IonButton } from '@ionic/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { TreeView } from '@lexical/react/LexicalTreeView';

export default function DebugTreeViewPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [minimize, setMinimize] = useState(false);
  return (
    <>
      {!minimize && (
        <TreeView
          viewClassName="tree-view-output"
          treeTypeButtonClassName="debug-treetype-button"
          timeTravelPanelClassName="debug-timetravel-panel"
          timeTravelButtonClassName="debug-timetravel-button"
          timeTravelPanelSliderClassName="debug-timetravel-panel-slider"
          timeTravelPanelButtonClassName="debug-timetravel-panel-button"
          editor={editor}
        />
      )}
      <IonButton
        id="show-writer-debug-view"
        fill="clear"
        onClick={() => {
          setMinimize(!minimize);
        }}
      >
        {minimize ? 'show' : 'hide'} debug view
      </IonButton>
    </>
  );
}
