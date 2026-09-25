import { RenderResult } from 'vitest-browser-react';

export function getListItem(screen: RenderResult, key: string) {
  return screen.locator.getByTestId(`notif-${key}`).getByRole('listitem');
}

export function getInfoButton(screen: RenderResult, key: string) {
  return getListItem(screen, key).getByRole('button', { name: 'Show details' });
}

export function getInfoAlert(screen: RenderResult) {
  return screen.getByRole('alertdialog');
}

export function getInfoAlertAcknowledgedAt(screen: RenderResult) {
  return getInfoAlert(screen).getByText('Acknowledged at:');
}

export function getInfoAlertContext(screen: RenderResult) {
  return getInfoAlert(screen).getByText('Context:');
}

export function getInfoAlertOpenDocumentBtn(screen: RenderResult) {
  return getInfoAlert(screen).getByRole('button', { name: 'Open document' });
}

export async function slideOpen(screen: RenderResult, key: string) {
  const slidingItem = screen.locator
    .getByTestId(`notif-${key}`)
    .element() as HTMLIonItemSlidingElement;
  await slidingItem.open('end');
  return slidingItem;
}

export function getAckBtn(screen: RenderResult, key: string) {
  return screen.locator
    .getByTestId(`notif-${key}`)
    .getByRole('button', { name: 'Mark read' })
    .first();
}

export function getUnAckBtn(screen: RenderResult, key: string) {
  return screen.locator
    .getByTestId(`notif-${key}`)
    .getByRole('button', { name: 'Mark unread' })
    .first();
}
