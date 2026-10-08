import { RenderResult } from 'vitest-browser-react';

export function getHeader(screen: RenderResult) {
  return screen.locator.getByRole('banner');
}

export function getFooter(screen: RenderResult) {
  return screen.locator.getByRole('contentinfo');
}

export function getMainList(screen: RenderResult) {
  return screen.locator.getByRole('main').getByRole('list');
}

export function getListItems(screen: RenderResult) {
  return getMainList(screen).getByRole('listitem');
}

export function getListItemWithText(screen: RenderResult, text: string) {
  return getMainList(screen)
    .getByRole('listitem')
    .filter({ hasText: text, exact: true });
}

export function getHeaderForUpdatedAtMode(screen: RenderResult) {
  return getHeader(screen).getByText('Last updated documents');
}

export function getHeaderForLastOpenedAtMode(screen: RenderResult) {
  return getHeader(screen).getByText('Last consulted documents');
}

export function getHeaderForConflictsMode(screen: RenderResult) {
  return getHeader(screen).getByText('Conflicts');
}

export function getSwitchModeBtn(screen: RenderResult) {
  return getFooter(screen).getByRole('button', { name: 'toggle browser mode' });
}
