import { ListType } from '@lexical/list';
import { HeadingTagType } from '@lexical/rich-text';
import { ElementFormatType, TextFormatType } from 'lexical';
import { expect } from 'vitest';
import { RenderResult } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

// content editor

export function getContentEditor(screen: RenderResult) {
  return screen.locator.getByRole('textbox');
}

export function getContentEditorElement(screen: RenderResult) {
  return getContentEditor(screen).element() as HTMLElement;
}

export async function getEditorTextContent(screen: RenderResult) {
  const composer = getContentEditor(screen);
  await expect.element(composer).toBeInTheDocument();

  const el = composer.element() as HTMLElement;
  expect(el.children).toHaveLength(1);
  return el.children[0].textContent;
}

function findNodeAtLine(screen: RenderResult, nthLine: number) {
  const rootChildren = getContentEditor(screen).element().children;
  return rootChildren[nthLine - 1];
}

type Resp = {
  node: ChildNode | null;
  offset: number;
};
function findNodeAtChar(
  element: Element | ChildNode,
  offset: number,
  range?: Resp
): Resp {
  let count = offset;
  if (!range) range = { node: null, offset: 0 };
  for (const child of element.childNodes) {
    if (child.nodeType === Node.TEXT_NODE && child.textContent) {
      if (count > child.textContent.length) {
        count -= child.textContent.length;
      } else {
        range.node = child;
        range.offset = count;
        return range;
      }
    } else {
      findNodeAtChar(child, count, range);
      if (range.node) return range;
      if (child.textContent) count -= child.textContent.length;
    }
  }
  return range;
}

export async function clickOnEditor(
  screen: RenderResult,
  nthLine: number,
  nthChar: number
) {
  const line = findNodeAtLine(screen, nthLine);
  const { node, offset } = findNodeAtChar(line, nthChar);
  if (!node) {
    throw new Error(`could not find node at {${nthLine}, ${nthChar}`);
  }
  const range = document.createRange();
  range.selectNodeContents(line);
  range.setStart(node, 0);
  range.setEnd(node, offset);
  range.collapse(false);
  const rect = range.getBoundingClientRect();
  const position = { x: rect.left + rect.width, y: rect.top + rect.height };

  // for list items
  if (node.parentElement?.parentElement) {
    const style = window.getComputedStyle(
      node.parentElement.parentElement,
      null
    );
    const marginTop = style.getPropertyValue('margin-top');
    position.y -= parseInt(marginTop.replace('px', '')); // remove margin
  }

  await userEvent.click(screen.baseElement, {
    position
  });
}

// toolbar

export function getToolbar(screen: RenderResult) {
  return screen.locator.getByRole('toolbar');
}

export function getAllToolbarBtns(screen: RenderResult) {
  return getToolbar(screen).getByRole('button').elements();
}

export function getToggleReadModeBtn(screen: RenderResult) {
  return getToolbar(screen).getByLabelText('Read Mode');
}

export function getTextFormatBtn(screen: RenderResult, format: TextFormatType) {
  return getToolbar(screen).getByLabelText('Format ' + format);
}

export function getInsertHRBtn(screen: RenderResult) {
  return getToolbar(screen).getByLabelText('Insert Horizontal Bar');
}

export function getHeadingBtn(screen: RenderResult, tag: HeadingTagType) {
  return getToolbar(screen).getByLabelText('Header ' + tag[1]);
}

export function getListBtn(screen: RenderResult, type: ListType) {
  let label;
  switch (type) {
    case 'bullet':
      label = 'Unordered';
      break;
    case 'number':
      label = 'Ordered';
      break;
    case 'check':
      label = 'Checked';
  }
  return getToolbar(screen).getByLabelText(`Insert ${label} List`);
}

export function getQuoteBtn(screen: RenderResult) {
  return getToolbar(screen).getByLabelText('Block Quote');
}

export function getTextAlignBtn(
  screen: RenderResult,
  format: ElementFormatType
) {
  return getToolbar(screen).getByLabelText('Align ' + format);
}

export function getLinkBtn(screen: RenderResult) {
  return getToolbar(screen).getByLabelText('Toggle link');
}

export function getLinkModal(screen: RenderResult) {
  return screen.getByRole('dialog');
}

export async function dismissModal(screen: RenderResult) {
  await (getLinkModal(screen).element() as HTMLIonPopoverElement).dismiss();
}

export function getLinkModalTextInput(screen: RenderResult) {
  return getLinkModal(screen).getByLabelText('Text');
}

export function getLinkModalUrlInput(screen: RenderResult) {
  return getLinkModal(screen).getByLabelText('Link');
}

export function getLinkModalToggleBtn(screen: RenderResult) {
  return getLinkModal(screen).getByLabelText('Toggle');
}
