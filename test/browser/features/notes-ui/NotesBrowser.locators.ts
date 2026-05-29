import { dateToStr } from '@/common/date-utils';
import { RenderResult } from 'vitest-browser-react';

export function getSelectANoteNote(screen: RenderResult) {
  return screen.locator.getByText('select a note');
}

export function getCreateANoteNote(screen: RenderResult) {
  return screen.locator.getByText('create a note');
}

export function getAddBtn(screen: RenderResult) {
  return screen.locator.getByRole('button', { name: 'add a note' });
}

export function getSortFilterBtn(screen: RenderResult) {
  return screen.locator.getByRole('button', { name: 'sort notes' });
}

export function getNotePreview(screen: RenderResult, preview?: string) {
  if (!preview || preview.length === 0) preview = 'empty note';
  return screen.locator
    .getByRole('listitem')
    .getByRole('button', { name: preview });
}

export function getContentEditor(screen: RenderResult) {
  return screen.locator.getByRole('textbox');
}

export function getToggleActionsBtn(screen: RenderResult) {
  return screen.locator.getByRole('button', { name: 'Toggle actions' });
}

export function getDeleteNoteBtn(screen: RenderResult) {
  return screen.locator.getByRole('button', { name: 'Delete note' });
}

export function getSwitchNoteInfoBtn(screen: RenderResult) {
  return screen.locator.getByRole('button', { name: 'Switch info' });
}

export function getCreatedAtNoteInfo(screen: RenderResult, createdAt: number) {
  return screen.locator.getByText(
    `Created at: ${dateToStr('date', createdAt)}`
  );
}

export function getUpdatedAtNoteInfo(screen: RenderResult, updatedAt: number) {
  return screen.locator.getByText(
    `Updated at: ${dateToStr('date', updatedAt)}`
  );
}

export function getSortSwitchDirectionBtn(screen: RenderResult) {
  return screen.locator.getByRole('button', { name: 'Sort direction' });
}
