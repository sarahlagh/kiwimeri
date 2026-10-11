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

export function getToggleReadModeBtn(screen: RenderResult) {
  return getToolbar(screen).getByLabelText('Read Mode');
}

export function getAllToolbarBtns(screen: RenderResult) {
  return getToolbar(screen).getByRole('button').elements();
}
