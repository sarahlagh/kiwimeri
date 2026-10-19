import {
  $createLinkNode,
  $isAutoLinkNode,
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
  LexicalEditor
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
import { useEffect, useRef } from 'react';
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

const handleLinkSubmission = (
  editor: LexicalEditor,
  payload: {
    isTextOrElementSelection: boolean;
    linkUrl?: string | null;
    linkText?: string | null;
  }
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
        const node = getSelectedNode(selection);
        node.replace(textNode);
      }
    });
  }
};

const handleAutoLinkSubmission = (
  editor: LexicalEditor,
  payload: {
    isTextOrElementSelection: boolean;
    linkUrl?: string | null;
    linkText?: string | null;
  }
) => {
  editor.update(() => {
    if (!payload.linkUrl) {
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
    } else if (payload.linkText && payload.linkText !== '') {
      const url = sanitizeUrl(payload.linkUrl);
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const node = getSelectedNode(selection);
      const parent = node.getParent();
      if ($isAutoLinkNode(parent)) {
        const linkNode = $createLinkNode(url);
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
  const payloadRef = useRef<{
    changed: boolean;
    isTextOrElementSelection: boolean;
    linkText?: string;
    linkUrl?: string;
  }>({
    isTextOrElementSelection: false,
    changed: false
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
          onIonInput={(e: InputCustomEvent) => {
            if (e.detail.value) {
              payloadRef.current.changed = true;
              payloadRef.current.linkText = e.detail.value;
            }
          }}
        ></IonInput>
      </IonItem>
      <IonItem className="inner-item">
        <IonInput
          label={t`Link`}
          placeholder="https://"
          value={payloadRef.current.linkUrl}
          onIonInput={(e: InputCustomEvent) => {
            if (e.detail.value) {
              payloadRef.current.changed = true;
              payloadRef.current.linkUrl = e.detail.value;
            }
          }}
        ></IonInput>
        {(linkContext.isAutoLink ||
          (payloadRef.current.linkUrl &&
            payloadRef.current.linkUrl !== '')) && (
          <IonButton
            fill="clear"
            aria-label={t`Toggle`}
            onClick={() => {
              payloadRef.current.changed = true;
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
            if (payloadRef.current.changed) {
              if (linkContext.isAutoLink) {
                handleAutoLinkSubmission(editor, payloadRef.current);
              } else {
                handleLinkSubmission(editor, payloadRef.current);
              }
            }
            payloadRef.current = {
              changed: false,
              isTextOrElementSelection: selection.isTextOrElementSelection
            };
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
