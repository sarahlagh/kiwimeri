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
  $createLinkNode,
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
  const [isAutoLinkUnlinked, setIsAutoLinkUnlinked] = useState(false);

  const [present, dismiss] = useIonPopover(
    <IonList lines="none" className="inner-list">
      <IonItem>{isAutoLink ? 'autolink' : 'manual link'}</IonItem>
      <IonItem className="inner-item">
        <IonInput
          label={t`Text`}
          value={linkText}
          onIonChange={(e: InputCustomEvent) => {
            if (typeof e.detail.value === 'string') {
              dismiss(
                { linkUrl, linkText: e.detail.value || '', isAutoLink },
                'input'
              );
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
              dismiss(
                { linkUrl: e.detail.value || '', linkText, isAutoLink },
                'input'
              );
            }
          }}
        ></IonInput>
        {(isAutoLink || linkUrl !== '') && (
          <IonButton
            fill="clear"
            onClick={() => {
              dismiss({ linkUrl: '', linkText: '', isAutoLink }, 'input');
            }}
          >
            <IonIcon
              icon={!isAutoLinkUnlinked ? APPICONS.deleteAction : APPICONS.ok}
            ></IonIcon>
          </IonButton>
        )}
      </IonItem>
    </IonList>,
    { linkUrl, linkText, isAutoLinkUnlinked, isAutoLink }
  );

  const readExistingLink = () => {
    editor.read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const node = getSelectedNode(selection);
        const parent = node.getParent();
        if ($isLinkNode(parent)) {
          setLinkUrl(parent.getURL());
          setIsAutoLink($isAutoLinkNode(parent));
          if ($isAutoLinkNode(parent)) {
            setIsAutoLinkUnlinked(parent.getIsUnlinked());
          }
        } else {
          setLinkUrl('');
          setIsAutoLink(false);
          setIsAutoLinkUnlinked(false);
        }
        setLinkText(selection.getTextContent() || node.getTextContent());
      }
    });
  };

  useEffect(() => {
    readExistingLink();
    if (isLinkEditMode) {
      present({
        onDidDismiss: (e: CustomEvent) => {
          setLinkUrl('');
          setLinkText('');
          setIsLinkEditMode(false);
          if (e.detail.role === 'input') {
            const { linkUrl, linkText, isAutoLink } = e.detail.data as {
              linkUrl: string;
              linkText: string;
              isAutoLink: boolean;
            };
            if (isAutoLink) {
              handleAutoLinkSubmission(linkUrl, linkText);
            } else {
              handleLinkSubmission(linkUrl, linkText);
            }
          }
        },
        cssClass: 'larger-width'
      });
    }
  }, [isLinkEditMode]);

  const handleLinkSubmission = (newLinkUrl: string, newLinkText: string) => {
    const undoLink = newLinkUrl === '';
    const url = sanitizeUrl(newLinkUrl);
    editor.update(() => {
      editor.dispatchCommand(
        TOGGLE_LINK_COMMAND,
        undoLink
          ? null
          : {
              url,
              title: newLinkText
            }
      );
      // if link not deleted and text changed, update text
      if (newLinkUrl !== '' && newLinkText !== '') {
        const textNode = $createTextNode(newLinkText);
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const node = getSelectedNode(selection);
          node.replace(textNode);
        }
      }
    });
  };

  const handleAutoLinkSubmission = (
    newLinkUrl: string,
    newLinkText: string
  ) => {
    const toggleLink = newLinkUrl === '';
    const url = sanitizeUrl(newLinkUrl);
    editor.update(() => {
      if (toggleLink) {
        // why doesn't TOGGLE_LINK_COMMAND work?
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const nodes = selection.extract();
          nodes.forEach(node => {
            const parent = node.getParent();
            if ($isAutoLinkNode(parent)) {
              // invert the value
              parent.setIsUnlinked(!parent.getIsUnlinked());
              parent.markDirty();
            }
          });
        }
      }
      if (newLinkText !== '') {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        const node = getSelectedNode(selection);
        const parent = node.getParent();
        if ($isAutoLinkNode(parent)) {
          const linkNode = $createLinkNode(url);
          parent.replace(linkNode);
          linkNode.clear();
          const textNode = $createTextNode(newLinkText);
          linkNode.append(textNode);
          textNode.selectEnd();
        }
      }
    });
  };

  return null;
}
