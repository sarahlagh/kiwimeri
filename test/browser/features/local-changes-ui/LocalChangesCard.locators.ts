import { RenderResult } from 'vitest-browser-react';

export function getCardTitle(screen: RenderResult, n: number) {
  return screen.locator.getByText(`Local Changes (${n})`);
}

export function getCardLocalDate(screen: RenderResult, full?: string) {
  return screen.locator.getByText(`Local: ` + (full || ''));
}

export function getCardLocalRemote(screen: RenderResult, full?: string) {
  return screen.locator.getByText(`Remote: ` + (full || ''));
}

export function getListItem(screen: RenderResult, key: string) {
  return screen.locator.getByTestId(`lc-key-${key}`);
}
