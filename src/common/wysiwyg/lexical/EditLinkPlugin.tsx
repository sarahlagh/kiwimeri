import {
  InputCustomEvent,
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  useIonPopover
} from '@ionic/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLingui } from '@lingui/react/macro';
import { Dispatch, useEffect, useState } from 'react';

import { APPICONS } from '@/constants';
import {
  $isAutoLinkNode,
  $isLinkNode,
  TOGGLE_LINK_COMMAND
} from '@lexical/link';
import { $createTextNode, $getSelection, $isRangeSelection } from 'lexical';
import { getSelectedNode } from './playground/utils/getSelectedNode';
import { sanitizeUrl } from './playground/utils/url';

export default function EditLinkPlugin({
  isLinkEditMode,
  setIsLinkEditMode
}: {
  isLinkEditMode: boolean;
  setIsLinkEditMode: Dispatch<boolean>;
}) {
  const { t } = useLingui();
  const [editor] = useLexicalComposerContext();
  const [linkText, setLinkText] = useState<string>('');
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [isAutoLink, setIsAutoLink] = useState(false);

  const [present, dismiss] = useIonPopover(
    <IonList lines="none" className="inner-list">
      <IonItem className="inner-item">
        <IonInput
          label={t`Text`}
          value={linkText}
          onIonChange={(e: InputCustomEvent) => {
            if (typeof e.detail.value === 'string') {
              dismiss({ linkUrl, linkText: e.detail.value || '' }, 'input');
            }
          }}
        ></IonInput>
      </IonItem>
      <IonItem className="inner-item">
        <IonInput
          label={t`Link`}
          placeholder="https://"
          value={linkUrl}
          onIonChange={(e: InputCustomEvent) => {
            if (typeof e.detail.value === 'string') {
              dismiss({ linkUrl: e.detail.value || '', linkText }, 'input');
            }
          }}
        ></IonInput>
        <IonButton
          fill="clear"
          onClick={() => {
            dismiss({ linkUrl: '', linkText: '' }, 'input');
          }}
        >
          <IonIcon icon={APPICONS.deleteAction}></IonIcon>
        </IonButton>
      </IonItem>
    </IonList>,
    { linkUrl, linkText }
  );

  useEffect(() => {
    if (isLinkEditMode) {
      readExistingLink();
      present({
        onDidDismiss: (e: CustomEvent) => {
          setLinkUrl('');
          setLinkText('');
          setIsLinkEditMode(false);
          if (e.detail.role === 'input') {
            const { linkUrl, linkText } = e.detail.data as {
              linkUrl: string;
              linkText: string;
            };
            handleLinkSubmission(linkUrl, linkText);
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
        const node = getSelectedNode(selection);
        const parent = node.getParent();
        if ($isLinkNode(parent)) {
          setLinkUrl(parent.getURL());
          setIsAutoLink($isAutoLinkNode(parent));
        }
        setLinkText(selection.getTextContent() || node.getTextContent());
      }
    });
  };

  const handleLinkSubmission = (newLinkUrl: string, newLinkText: string) => {
    const undoLink = newLinkUrl === '';
    editor.update(() => {
      editor.dispatchCommand(
        TOGGLE_LINK_COMMAND,
        undoLink
          ? null
          : {
              url: sanitizeUrl(newLinkUrl),
              title: newLinkText
            }
      );
      if (!isAutoLink && newLinkUrl !== '' && newLinkText !== '') {
        const textNode = $createTextNode(newLinkText);
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const node = getSelectedNode(selection);
          node.replace(textNode);
        }
      }
      // TODO if isAutoLink and request delete, setIsUnlinked - why doesn't TOGGLE_LINK_COMMAND work anymore?
      // TODO if isAutoLink, replace the node by a link with text
    });
  };

  return null;
}
