import {
  InputCustomEvent,
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  useIonPopover
} from '@ionic/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLingui } from '@lingui/react/macro';
import { Dispatch, useEffect, useState } from 'react';

import { APPICONS } from '@/constants';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $getSelection, $isRangeSelection } from 'lexical';
import { getSelectedNode } from './playground/utils/getSelectedNode';
import { sanitizeUrl } from './playground/utils/url';

// DONE set new link
// DONE edit existing link
// DONE remove existing link
// DONE prettify popover
// TODO toggle auto link on/off
// TODO edit text of link node
export default function EditLinkPlugin({
  isLinkEditMode,
  setIsLinkEditMode
}: {
  isLinkEditMode: boolean;
  setIsLinkEditMode: Dispatch<boolean>;
}) {
  const { t } = useLingui();
  const [editor] = useLexicalComposerContext();
  const [linkUrl, setLinkUrl] = useState<string>('');

  const [present, dismiss] = useIonPopover(
    <IonItem className="inner-item">
      <IonInput
        label={t`Link`}
        placeholder="https://"
        value={linkUrl}
        onIonChange={(e: InputCustomEvent) => {
          if (typeof e.detail.value === 'string') {
            dismiss(e.detail.value || '', 'input');
          }
        }}
      ></IonInput>
      <IonButton
        fill="clear"
        onClick={() => {
          dismiss('', 'input');
        }}
      >
        <IonIcon icon={APPICONS.deleteAction}></IonIcon>
      </IonButton>
    </IonItem>,
    { linkUrl }
  );

  useEffect(() => {
    if (isLinkEditMode) {
      readExistingLink();
      present({
        onDidDismiss: (e: CustomEvent) => {
          setLinkUrl('');
          setIsLinkEditMode(false);
          if (e.detail.role === 'input') {
            handleLinkSubmission(e.detail.data || '');
          }
        },
        cssClass: 'larger-width'
      });
    }
  }, [isLinkEditMode]);

  const readExistingLink = () => {
    editor.read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const parent = getSelectedNode(selection).getParent();
        if ($isLinkNode(parent)) {
          setLinkUrl(parent.getURL());
        }
      }
    });
  };

  const handleLinkSubmission = (newValue: string) => {
    editor.update(() => {
      editor.dispatchCommand(
        TOGGLE_LINK_COMMAND,
        newValue === '' ? null : sanitizeUrl(newValue)
      );
    });
  };

  return null;
}
