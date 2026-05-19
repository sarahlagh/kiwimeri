import { dateToStr } from '@/common/date-utils';
import { RenderResult } from 'vitest-browser-react';

export function getSelectACommentNote(screen: RenderResult) {
  return screen.locator.getByText('select a comment');
}

export function getCreateACommentNote(screen: RenderResult) {
  return screen.locator.getByText('create a comment');
}

export function getAddBtn(screen: RenderResult) {
  return screen.locator.getByRole('button', { name: 'add a comment' });
}

export function getSortFilterBtn(screen: RenderResult) {
  return screen.locator.getByRole('button', { name: 'sort comments' });
}

export function getCommentPreview(screen: RenderResult, preview?: string) {
  if (!preview || preview.length === 0) preview = 'empty comment';
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

export function getDeleteCommentBtn(screen: RenderResult) {
  return screen.locator.getByRole('button', { name: 'Delete comment' });
}

export function getSwitchCommentInfoBtn(screen: RenderResult) {
  return screen.locator.getByRole('button', { name: 'Switch info' });
}

export function getCreatedAtCommentInfo(
  screen: RenderResult,
  createdAt: number
) {
  return screen.locator.getByText(
    `Created at: ${dateToStr('date', createdAt)}`
  );
}

export function getUpdatedAtCommentInfo(
  screen: RenderResult,
  updatedAt: number
) {
  return screen.locator.getByText(
    `Updated at: ${dateToStr('date', updatedAt)}`
  );
}

export function getSortSwitchDirectionBtn(screen: RenderResult) {
  return screen.locator.getByRole('button', { name: 'Sort direction' });
}
