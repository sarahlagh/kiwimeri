import { IonIcon } from '@ionic/react';
import { $isLinkNode } from '@lexical/link';
import {
  $isListNode,
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode
} from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode
} from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import {
  $findMatchingParent,
  $getNearestNodeOfType,
  mergeRegister
} from '@lexical/utils';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND
} from 'lexical';
import { Dispatch, useCallback, useEffect, useRef, useState } from 'react';
const LowPriority = 1;

import { APPICONS } from '@/constants';
import { getSelectedNode } from './playground/utils/getSelectedNode';
import './theme/KiwimeriToolbarPlugin.scss';

function Divider() {
  return <div className="divider" />;
}

export type ToolbarPluginProps = {
  enablePageBrowser?: boolean;
  pageBrowserButtonHighlighted?: boolean;
  openPageBrowser?: boolean;
  setOpenPageBrowser?: Dispatch<boolean>;
  setIsLinkEditMode: Dispatch<boolean>;
};

export default function ToolbarPlugin({
  enablePageBrowser = false,
  pageBrowserButtonHighlighted = false,
  openPageBrowser = false,
  setOpenPageBrowser,
  setIsLinkEditMode
}: ToolbarPluginProps) {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef(null);
  const [isEditable, setIsEditable] = useState(true);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isH1, setIsH1] = useState(false);
  const [isH2, setIsH2] = useState(false);
  const [isH3, setIsH3] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isBlockQuote, setIsBlockQuote] = useState(false);
  const [isUnorderedList, setIsUnorderedList] = useState(false);
  const [isOrderedList, setIsOrderedList] = useState(false);
  const [isCheckedList, setIsCheckedList] = useState(false);
  const [isLink, setIsLink] = useState(false);

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      // Update text format
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));

      const anchorNode = selection.anchor.getNode();
      let element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : $findMatchingParent(anchorNode, e => {
              const parent = e.getParent();
              return parent !== null && $isRootOrShadowRoot(parent);
            });

      if (element === null) {
        element = anchorNode.getTopLevelElementOrThrow();
      }

      let type;
      if ($isListNode(element)) {
        const parentList = $getNearestNodeOfType<ListNode>(
          anchorNode,
          ListNode
        );
        type = parentList ? parentList.getListType() : element.getListType();
      } else {
        type = $isHeadingNode(element) ? element.getTag() : element.getType();
      }

      const node = getSelectedNode(selection);
      const parent = node.getParent();
      const isLink = $isLinkNode(parent) || $isLinkNode(anchorNode);
      setIsLink(isLink);

      setIsH1(type === 'h1');
      setIsH2(type === 'h2');
      setIsH3(type === 'h3');
      setIsBlockQuote(type === 'quote');
      setIsCheckedList(type === 'check');
      setIsUnorderedList(type === 'bullet');
      setIsOrderedList(type === 'number');
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (_payload, _newEditor) => {
          $updateToolbar();
          return false;
        },
        LowPriority
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        payload => {
          setCanUndo(payload);
          return false;
        },
        LowPriority
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        payload => {
          setCanRedo(payload);
          return false;
        },
        LowPriority
      )
    );
  }, [editor, $updateToolbar]);

  return (
    <div className="toolbar" ref={toolbarRef}>
      {enablePageBrowser && setOpenPageBrowser && (
        <>
          <button
            onClick={() => {
              openPageBrowser = !openPageBrowser;
              setOpenPageBrowser(openPageBrowser);
            }}
            className={
              'toolbar-item ' + (pageBrowserButtonHighlighted ? 'active' : '')
            }
            aria-label="Show page browser"
          >
            <IonIcon icon={APPICONS.page}></IonIcon>
          </button>{' '}
          <Divider />
        </>
      )}
      <button
        onClick={() => {
          editor.setEditable(!editor.isEditable());
          setIsEditable(editor.isEditable());
        }}
        className={'toolbar-item ' + (!isEditable ? 'active' : '')}
        aria-label="Read Mode"
      >
        <IonIcon className="format" src="writer/book.svg"></IonIcon>
      </button>
      <button
        disabled={!canUndo}
        onClick={() => {
          editor.dispatchCommand(UNDO_COMMAND, undefined);
        }}
        className="toolbar-item"
        aria-label="Undo"
      >
        <IonIcon
          className="format"
          src="writer/arrow-counterclockwise.svg"
        ></IonIcon>
      </button>
      <button
        disabled={!canRedo}
        onClick={() => {
          editor.dispatchCommand(REDO_COMMAND, undefined);
        }}
        className="toolbar-item"
        aria-label="Redo"
      >
        <IonIcon className="format" src="writer/arrow-clockwise.svg"></IonIcon>
      </button>
      <Divider />
      <button
        onClick={() => {
          editor.update(() => {
            const selection = $getSelection();
            $setBlocksType(selection, () =>
              !isH1 ? $createHeadingNode('h1') : $createParagraphNode()
            );
          });
        }}
        className={'toolbar-item ' + (isH1 ? 'active' : '')}
        aria-label="Header 1"
      >
        <IonIcon className="format" src="writer/type-h1.svg"></IonIcon>
      </button>
      <button
        onClick={() => {
          editor.update(() => {
            const selection = $getSelection();
            $setBlocksType(selection, () =>
              !isH2 ? $createHeadingNode('h2') : $createParagraphNode()
            );
          });
        }}
        className={'toolbar-item ' + (isH2 ? 'active' : '')}
        aria-label="Header 1"
      >
        <IonIcon className="format" src="writer/type-h2.svg"></IonIcon>
      </button>
      <button
        onClick={() => {
          editor.update(() => {
            const selection = $getSelection();
            $setBlocksType(selection, () =>
              !isH3 ? $createHeadingNode('h3') : $createParagraphNode()
            );
          });
        }}
        className={'toolbar-item ' + (isH3 ? 'active' : '')}
        aria-label="Header 3"
      >
        <IonIcon className="format" src="writer/type-h3.svg"></IonIcon>
      </button>
      <Divider />
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
        }}
        className={'toolbar-item ' + (isBold ? 'active' : '')}
        aria-label="Format Bold"
      >
        <IonIcon className="format" src="writer/type-bold.svg"></IonIcon>
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
        }}
        className={'toolbar-item ' + (isItalic ? 'active' : '')}
        aria-label="Format Italics"
      >
        <IonIcon className="format" src="writer/type-italic.svg"></IonIcon>
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
        }}
        className={'toolbar-item ' + (isUnderline ? 'active' : '')}
        aria-label="Format Underline"
      >
        <IonIcon className="format" src="writer/type-underline.svg"></IonIcon>
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
        }}
        className={'toolbar-item ' + (isStrikethrough ? 'active' : '')}
        aria-label="Format Strikethrough"
      >
        <IonIcon
          className="format"
          src="writer/type-strikethrough.svg"
        ></IonIcon>
      </button>
      <button
        onClick={() => {
          editor.update(() => {
            const selection = $getSelection();
            $setBlocksType(selection, () =>
              !isBlockQuote ? $createQuoteNode() : $createParagraphNode()
            );
          });
        }}
        className={'toolbar-item ' + (isBlockQuote ? 'active' : '')}
        aria-label="Block Quote"
      >
        <IonIcon className="format" src="writer/quote.svg"></IonIcon>
      </button>
      <Divider />
      <button
        onClick={() => {
          if (!isUnorderedList) {
            editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
          } else {
            editor.update(() => {
              const selection = $getSelection();
              $setBlocksType(selection, () => $createParagraphNode());
            });
          }
        }}
        className={'toolbar-item ' + (isUnorderedList ? 'active' : '')}
        aria-label="Insert Unordered List"
      >
        <IonIcon className="format" src="writer/list-ul.svg"></IonIcon>
      </button>
      <button
        onClick={() => {
          if (!isOrderedList) {
            editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
          } else {
            editor.update(() => {
              const selection = $getSelection();
              $setBlocksType(selection, () => $createParagraphNode());
            });
          }
        }}
        className={'toolbar-item ' + (isOrderedList ? 'active' : '')}
        aria-label="Insert Ordered List"
      >
        <IonIcon className="format" src="writer/list-ol.svg"></IonIcon>
      </button>
      <button
        onClick={() => {
          if (!isCheckedList) {
            editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
          } else {
            editor.update(() => {
              const selection = $getSelection();
              $setBlocksType(selection, () => $createParagraphNode());
            });
          }
        }}
        className={'toolbar-item ' + (isCheckedList ? 'active' : '')}
        aria-label="Insert Checked List"
      >
        <IonIcon className="format" src="writer/list-check.svg"></IonIcon>
      </button>
      <Divider />
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
        }}
        className="toolbar-item"
        aria-label="Left Align"
      >
        <IonIcon className="format" src="writer/text-left.svg"></IonIcon>
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
        }}
        className="toolbar-item"
        aria-label="Center Align"
      >
        <IonIcon className="format" src="writer/text-center.svg"></IonIcon>
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
        }}
        className="toolbar-item"
        aria-label="Right Align"
      >
        <IonIcon className="format" src="writer/text-right.svg"></IonIcon>
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
        }}
        className="toolbar-item"
        aria-label="Justify Align"
      >
        <IonIcon className="format" src="writer/justify.svg"></IonIcon>
      </button>
      <Divider />
      <button
        onClick={() => {
          editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
        }}
        className="toolbar-item"
        aria-label="Insert Horizontal Bar"
      >
        <IonIcon className="format" src="writer/hr.svg"></IonIcon>
      </button>
      <button
        disabled={!isEditable}
        onClick={() => {
          setIsLinkEditMode(true);
        }}
        className={'toolbar-item spaced ' + (isLink ? 'active' : '')}
        aria-label="Insert link"
        type="button"
      >
        <IonIcon className="format" src="writer/link-45deg.svg"></IonIcon>
      </button>
      <Divider />
      <button
        onClick={() => {
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              selection.getNodes().forEach(node => {
                if ($isTextNode(node)) {
                  node.setFormat(0);
                }
              });
            }
            $setBlocksType(selection, () => $createParagraphNode());
          });
        }}
        className="toolbar-item"
        aria-label="Clear Format"
      >
        <IonIcon className="format" src="writer/x-square.svg"></IonIcon>
      </button>
    </div>
  );
}
