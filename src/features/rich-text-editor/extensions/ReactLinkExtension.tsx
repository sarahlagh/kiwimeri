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
import { RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { CREATE_LINK_AT_WORD_UNDER_CURSOR_COMMAND } from '../commands/word-under-cursor-commands';
import { useSelectionContext } from '../hooks';
import { getSelectedNode } from '../utils/getSelectedNode';
import { sanitizeUrl } from '../utils/url';
import { SelectionContext } from './SelectionContextExtension';

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

type ModalInputs = {
  textChanged: boolean;
  urlChanged: boolean;
  linkText?: string;
  linkUrl?: string | null;
};

type FullResultPayload = ModalInputs & {
  isTextOrElementSelection: boolean;
  isTextWordUnderCursor?: boolean;
  wordUnderCursor?: SelectionContext['wordUnderCursor'];
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
  payload: FullResultPayload
) => {
  editor.dispatchCommand(
    payload.isTextWordUnderCursor !== true
      ? TOGGLE_LINK_COMMAND
      : CREATE_LINK_AT_WORD_UNDER_CURSOR_COMMAND,
    payload.linkUrl
      ? {
          url: sanitizeUrl(payload.linkUrl),
          title: payload.linkText,
          wordUnderCursor: payload.wordUnderCursor
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
  payload: FullResultPayload
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

function EditLinkPopover({
  inputsRef,
  payload,
  linkContext,
  dismiss
}: {
  inputsRef: RefObject<ModalInputs>;
  payload: { linkText: string; linkUrl?: string };
  linkContext: SelectionContext['links'];
  dismiss: () => void;
}) {
  const { t } = useLingui();
  const [textWillChange, setTextWillChange] = useState(false);

  return (
    <IonList lines="none" className="inner-list">
      <IonItem className="inner-item">
        <IonInput
          label={t`Text`}
          value={payload.linkText}
          disabled={linkContext.isAutoLink && textWillChange !== true}
          onIonInput={(e: InputCustomEvent) => {
            if (e.detail.value) {
              inputsRef.current.textChanged = true;
              inputsRef.current.linkText = e.detail.value;
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
          value={payload.linkUrl}
          onIonInput={(e: InputCustomEvent) => {
            if (e.detail.value) {
              inputsRef.current.urlChanged = true;
              inputsRef.current.linkUrl = e.detail.value;
            }
          }}
        />
        {(linkContext.isAutoLink ||
          (payload.linkUrl && payload.linkUrl !== '')) && (
          <IonButton
            fill="clear"
            aria-label={t`Toggle`}
            onClick={() => {
              inputsRef.current.urlChanged = true;
              inputsRef.current.linkUrl = null;
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
}

const OpenLinkModalPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const selection = useSelectionContext();
  const linkContext = selection.links;

  const payload = useMemo(
    () => ({
      isTextOrElementSelection: selection.isTextOrElementSelection,
      linkUrl: linkContext.linkUrl,
      linkText:
        linkContext.linkText ||
        (selection.wordUnderCursor ? selection.wordUnderCursor[2] : ''),
      wordUnderCursor: selection.wordUnderCursor,
      isTextWordUnderCursor: !linkContext.isLink && !linkContext.linkText
    }),
    [linkContext, selection]
  );
  const inputsRef = useRef<ModalInputs>({
    textChanged: false,
    urlChanged: false
  });

  const [present, dismiss] = useIonPopover(EditLinkPopover, {
    inputsRef,
    payload,
    linkContext,
    dismiss: () => dismiss()
  });
  useEffect(() => {
    return editor.registerCommand(
      OPEN_LINK_MODAL_COMMAND,
      () => {
        present({
          htmlAttributes: { role: 'dialog' },
          cssClass: 'larger-width',
          onDidDismiss: () => {
            const finalPayload = { ...payload, ...inputsRef.current };
            if (finalPayload.textChanged || finalPayload.urlChanged) {
              if (linkContext.isAutoLink) {
                handleAutoLinkSubmission(editor, finalPayload);
              } else {
                handleLinkSubmission(editor, finalPayload);
              }
            }
          }
        });
        return false;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor, present, linkContext, payload]);

  return null;
};

const ReactLinkExtension = defineExtension({
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

export default ReactLinkExtension;
