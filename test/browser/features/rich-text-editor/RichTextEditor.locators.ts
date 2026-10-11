import { HeadingTagType } from '@lexical/rich-text';
import { TextFormatType } from 'lexical';
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
