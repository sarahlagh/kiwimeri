import {
  $createAutoLinkNode,
  $createLinkNode,
  $isAutoLinkNode,
  $isLinkNode,
  AutoLinkExtension,
  LinkExtension,
  TOGGLE_LINK_COMMAND
} from '@lexical/link';
import {
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  configExtension,
  createCommand,
  defineExtension,
  LexicalCommand,
  LexicalEditor,
  RangeSelection
} from 'lexical';

import { APPICONS } from '@/constants';
import {
  EMAIL_REGEX,
  URL_REGEX
} from '@/domain/format-conversion/text-parsing/markdown-parser/markdown-elements';
import {
  InputCustomEvent,
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  useIonPopover
} from '@ionic/react';
import { createLinkMatcherWithRegExp } from '@lexical/react/LexicalAutoLinkPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ReactExtension } from '@lexical/react/ReactExtension';
import { useLingui } from '@lingui/react/macro';
import { useEffect, useRef, useState } from 'react';
import { useEditorContext } from '../EditorContext';
import { getSelectedNode } from '../utils/getSelectedNode';
import { sanitizeUrl } from '../utils/url';

const MATCHERS = [
  createLinkMatcherWithRegExp(URL_REGEX, text => {
    return text.startsWith('http') ? text : `https://${text}`;
  }),
  createLinkMatcherWithRegExp(EMAIL_REGEX, text => {
    return `mailto:${text}`;
  })
];

export const OPEN_LINK_MODAL_COMMAND: LexicalCommand<void> = createCommand(
  'OPEN_LINK_MODAL_COMMAND'
);

type ModalResultPayload = {
  textChanged: boolean;
  urlChanged: boolean;
  isTextOrElementSelection: boolean;
  linkText?: string;
  linkUrl?: string;
};

function getLinkParentNode(selection: RangeSelection) {
  const nodes = selection.extract().filter(n => {
    const parent = n.getParent();
    return $isLinkNode(parent) || $isAutoLinkNode(parent);
  });
  // should always have one node, and should always have the same parent
  return nodes[0]?.getParent();
}

const handleLinkSubmission = (
  editor: LexicalEditor,
  payload: ModalResultPayload
) => {
  editor.dispatchCommand(
    TOGGLE_LINK_COMMAND,
    payload.linkUrl
      ? {
          url: sanitizeUrl(payload.linkUrl),
          title: payload.linkText
        }
      : null
  );
  // if link not deleted and text changed, update text
  if (
    payload.linkUrl &&
    payload.linkUrl !== '' &&
    payload.linkText &&
    payload.linkText !== ''
  ) {
    editor.update(() => {
      const textNode = $createTextNode(payload.linkText!);
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const parent = getLinkParentNode(selection);
        if ($isLinkNode(parent)) {
          const linkNode = $createLinkNode(parent.getURL(), {
            title: parent.getTitle(),
            rel: parent.getRel()
          });
          parent.replace(linkNode);
          linkNode.clear();
          linkNode.append(textNode);
          textNode.selectEnd();
        }
      }
    });
  }
};

const handleAutoLinkSubmission = (
  editor: LexicalEditor,
  payload: ModalResultPayload
) => {
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    if (!payload.linkUrl) {
      // toggle unlinked
      const node = getSelectedNode(selection);
      const parent = node.getParent();
      if ($isAutoLinkNode(parent)) {
        // invert the value
        parent.setIsUnlinked(!parent.getIsUnlinked());
        parent.markDirty();
      }
    } else if (payload.urlChanged && payload.linkUrl !== '') {
      const url = sanitizeUrl(payload.linkUrl);
      const parent = getLinkParentNode(selection);
      if ($isAutoLinkNode(parent)) {
        const linkNode = $createAutoLinkNode(url, {
          isUnlinked: parent.getIsUnlinked()
        });
        const textNode = $createTextNode(url);
        linkNode.append(textNode);
        parent?.replace(linkNode);
        textNode.select();
      }
    }
    if (!payload.textChanged) return;
    const newSelection = $getSelection();
    if (!$isRangeSelection(newSelection)) return;
    if (payload.linkText && payload.linkText !== '') {
      const parent = getLinkParentNode(newSelection);
      if ($isAutoLinkNode(parent)) {
        const linkNode = $createLinkNode(parent.getURL());
        parent.replace(linkNode);
        linkNode.clear();
        const textNode = $createTextNode(payload.linkText);
        linkNode.append(textNode);
        textNode.selectEnd();
      }
    }
  });
};

const OpenLinkModalPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const { selectionContext: selection } = useEditorContext();
  const linkContext = selection.links;
  const { t } = useLingui();
  const [textWillChange, setTextWillChange] = useState(false);
  const payloadRef = useRef<ModalResultPayload>({
    isTextOrElementSelection: false,
    textChanged: false,
    urlChanged: false
  });
  payloadRef.current.isTextOrElementSelection =
    selection.isTextOrElementSelection;
  payloadRef.current.linkText = linkContext.linkText;
  payloadRef.current.linkUrl = linkContext.linkUrl;
  const [present, dismiss] = useIonPopover(
    <IonList lines="none" className="inner-list">
      <IonItem className="inner-item">
        <IonInput
          label={t`Text`}
          value={payloadRef.current.linkText}
          disabled={linkContext.isAutoLink && textWillChange !== true}
          onIonInput={(e: InputCustomEvent) => {
            if (e.detail.value) {
              payloadRef.current.textChanged = true;
              payloadRef.current.linkText = e.detail.value;
            }
          }}
        />
        {linkContext.isAutoLink && (
          <IonButton
            fill="clear"
            aria-label={t`Edit text`}
            onClick={() => {
              setTextWillChange(true);
            }}
          >
            <IonIcon icon={APPICONS.renameAction}></IonIcon>
          </IonButton>
        )}
      </IonItem>
      <IonItem className="inner-item">
        <IonInput
          label={t`Link`}
          placeholder="https://"
          value={payloadRef.current.linkUrl}
          onIonInput={(e: InputCustomEvent) => {
            if (e.detail.value) {
              payloadRef.current.urlChanged = true;
              payloadRef.current.linkUrl = e.detail.value;
            }
          }}
        />
        {(linkContext.isAutoLink ||
          (payloadRef.current.linkUrl &&
            payloadRef.current.linkUrl !== '')) && (
          <IonButton
            fill="clear"
            aria-label={t`Toggle`}
            onClick={() => {
              payloadRef.current.urlChanged = true;
              delete payloadRef.current.linkUrl;
              dismiss();
            }}
          >
            <IonIcon
              icon={
                !linkContext.isAutoLinkUnlinked
                  ? APPICONS.deleteAction
                  : APPICONS.ok
              }
            ></IonIcon>
          </IonButton>
        )}
      </IonItem>
    </IonList>
  );
  useEffect(() => {
    return editor.registerCommand(
      OPEN_LINK_MODAL_COMMAND,
      () => {
        present({
          htmlAttributes: { role: 'dialog' },
          cssClass: 'larger-width',
          onDidDismiss() {
            if (
              payloadRef.current.textChanged ||
              payloadRef.current.urlChanged
            ) {
              if (linkContext.isAutoLink) {
                handleAutoLinkSubmission(editor, payloadRef.current);
              } else {
                handleLinkSubmission(editor, payloadRef.current);
              }
            }
            payloadRef.current = {
              textChanged: false,
              urlChanged: false,
              isTextOrElementSelection: selection.isTextOrElementSelection
            };
            setTextWillChange(false);
          }
        });
        return false;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor, present, linkContext, selection.isTextOrElementSelection]);

  return null;
};

const CustomLinkExtension = defineExtension({
  name: '@kiwimeri/rich-text/links',
  namespace: 'react-rich',
  dependencies: [
    configExtension(ReactExtension, {
      decorators: [<OpenLinkModalPlugin key="" />]
    }),
    LinkExtension,
    configExtension(AutoLinkExtension, {
      matchers: MATCHERS
    })
  ]
});

export default CustomLinkExtension;
