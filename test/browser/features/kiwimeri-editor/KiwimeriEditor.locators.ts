import { RenderResult } from 'vitest-browser-react';

export function getContentEditor(screen: RenderResult) {
  return screen.locator.getByRole('textbox');
}

export function getContentEditorElement(screen: RenderResult) {
  return getContentEditor(screen).element() as HTMLElement;
}
