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
  $isHeadingNode,
  HeadingTagType
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
  ElementNode,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  TextFormatType,
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

type ToolbarButtonProps = {
  ariaLabel: string;
  icon: string;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  isActive?: boolean;
};

function ToolbarButton({
  ariaLabel,
  icon,
  disabled = false,
  isActive = false,
  onClick
}: ToolbarButtonProps) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={'toolbar-item ' + (isActive ? 'active' : '')}
      aria-label={ariaLabel}
    >
      <IonIcon className="format" src={icon}></IonIcon>
    </button>
  );
}

function SetBlockTypeToolbarButton({
  createBlock,
  isActive,
  icon,
  ariaLabel
}: {
  createBlock: () => ElementNode;
  isActive: boolean;
  icon: string;
  ariaLabel: string;
}) {
  const [editor] = useLexicalComposerContext();
  return (
    <ToolbarButton
      ariaLabel={ariaLabel}
      icon={icon}
      isActive={isActive}
      onClick={() => {
        editor.update(() => {
          const selection = $getSelection();
          $setBlocksType(selection, () =>
            !isActive ? createBlock() : $createParagraphNode()
          );
        });
      }}
    />
  );
}

function HeadingToolbarButton({
  level,
  isActive
}: {
  level: number;
  isActive: boolean;
}) {
  const tag = `h${level}` as HeadingTagType;
  return (
    <SetBlockTypeToolbarButton
      ariaLabel={`Header ${level}`}
      icon={`writer/type-${tag}.svg`}
      isActive={isActive}
      createBlock={() => $createHeadingNode(tag)}
    />
  );
}

function TextFormatToolbarButton({
  formatType,
  isActive
}: {
  formatType: TextFormatType;
  isActive: boolean;
}) {
  const [editor] = useLexicalComposerContext();
  return (
    <ToolbarButton
      ariaLabel={`Format ${formatType}`}
      icon={`writer/type-${formatType}.svg`}
      isActive={isActive}
      onClick={() => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, formatType);
      }}
    />
  );
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
  const [isHighlight, setIsHighlight] = useState(false);
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
      setIsHighlight(selection.hasFormat('highlight'));

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
      <div className="floating">
        <ToolbarButton
          ariaLabel="Read Mode"
          icon="writer/book.svg"
          isActive={!isEditable}
          onClick={() => {
            editor.setEditable(!editor.isEditable());
            setIsEditable(editor.isEditable());
          }}
        />
        <ToolbarButton
          ariaLabel="Undo"
          icon="writer/arrow-counterclockwise.svg"
          disabled={!canUndo}
          onClick={() => {
            editor.dispatchCommand(UNDO_COMMAND, undefined);
          }}
        />
        <ToolbarButton
          ariaLabel="Redo"
          icon="writer/arrow-clockwise.svg"
          disabled={!canRedo}
          onClick={() => {
            editor.dispatchCommand(REDO_COMMAND, undefined);
          }}
        />
        <Divider />

        <HeadingToolbarButton level={1} isActive={isH1} />
        <HeadingToolbarButton level={2} isActive={isH2} />
        <HeadingToolbarButton level={3} isActive={isH3} />

        <Divider />

        <TextFormatToolbarButton formatType="bold" isActive={isBold} />
        <TextFormatToolbarButton formatType="italic" isActive={isItalic} />
        <TextFormatToolbarButton
          formatType="strikethrough"
          isActive={isStrikethrough}
        />
        <TextFormatToolbarButton
          formatType="underline"
          isActive={isUnderline}
        />
        <TextFormatToolbarButton
          formatType="highlight"
          isActive={isHighlight}
        />
        <SetBlockTypeToolbarButton
          ariaLabel="Block Quote"
          icon="writer/quote.svg"
          isActive={isBlockQuote}
          createBlock={() => $createQuoteNode()}
        />
        <Divider />
        <ToolbarButton
          ariaLabel="Insert Unordered List"
          icon="writer/list-ul.svg"
          isActive={isUnorderedList}
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
        />
        <ToolbarButton
          ariaLabel="Insert Ordered List"
          icon="writer/list-ol.svg"
          isActive={isOrderedList}
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
        />
        <ToolbarButton
          ariaLabel="Insert Checked List"
          icon="writer/list-check.svg"
          isActive={isCheckedList}
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
        />
        <Divider />
        <ToolbarButton
          ariaLabel="Left Align"
          icon="writer/text-left.svg"
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
          }}
        />
        <ToolbarButton
          ariaLabel="Center Align"
          icon="writer/text-center.svg"
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
          }}
        />
        <ToolbarButton
          ariaLabel="Right Align"
          icon="writer/text-right.svg"
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
          }}
        />
        <ToolbarButton
          ariaLabel="Justify Align"
          icon="writer/text-justify.svg"
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
          }}
        />
        <Divider />
        <ToolbarButton
          ariaLabel="Insert Horizontal Bar"
          icon="writer/hr.svg"
          onClick={() => {
            editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
          }}
        />

        <ToolbarButton
          disabled={!isEditable}
          isActive={isLink}
          ariaLabel="Insert link"
          icon="writer/link-45deg.svg"
          onClick={() => {
            setIsLinkEditMode(true);
          }}
        />
        <Divider />

        <ToolbarButton
          ariaLabel="writer/x-square.svg"
          icon="writer/x-square.svg"
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
        />
      </div>
      <div className="fixed">
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
            </button>
          </>
        )}
      </div>
    </div>
  );
}
