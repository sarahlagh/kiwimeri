import { ListType } from '@lexical/list';
import { HeadingTagType } from '@lexical/rich-text';
import { ElementFormatType, TextFormatType } from 'lexical';
import { expect } from 'vitest';
import { RenderResult } from 'vitest-browser-react';

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
