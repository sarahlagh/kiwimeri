import { RenderResult } from 'vitest-browser-react';

export function getSelectSessionModeCheck(screen: RenderResult) {
  return screen.getByRole('switch', { name: 'Session Mode' });
}

export function getSelectDurationRadio(
  screen: RenderResult,
  durationInMinutes: number
) {
  return screen.getByRole('radio', { name: `${durationInMinutes} minutes` });
}

export function getStartWritingBtn(screen: RenderResult) {
  return screen.getByRole('button', { name: 'Start Writing' });
}

export function getProgressBar(screen: RenderResult) {
  return screen.getByRole('progressbar');
}

export function getIndicatorIcon(screen: RenderResult) {
  return screen.getByTestId('indicator-icon');
}

export function getDiscardBtn(screen: RenderResult) {
  return screen.getByRole('button', { name: 'Discard' });
}

export function getSaveBtn(screen: RenderResult) {
  return screen.getByRole('button', { name: 'Save your work' });
}

export function getWordCountLabel(screen: RenderResult, wc: number) {
  return screen.getByText(`${wc} words`);
}

export function getMainList(screen: RenderResult) {
  return screen.getByRole('list');
}

export function getListItems(screen: RenderResult) {
  return getMainList(screen).getByRole('listitem');
}

export function getListItemWithText(screen: RenderResult, text: string) {
  return getMainList(screen).getByRole('listitem').filter({ hasText: text });
}

export function getModalSaveBtn(screen: RenderResult) {
  return screen.getByRole('button', { name: 'Save' });
}

export function getModalMergeBtn(screen: RenderResult) {
  return screen.getByRole('button', { name: 'Merge' });
}

export function getModalCloseBtn(screen: RenderResult) {
  return screen.getByRole('button', { name: 'Close' });
}
