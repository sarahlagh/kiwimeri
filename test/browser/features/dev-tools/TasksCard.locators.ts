import { RenderResult } from 'vitest-browser-react';

export function getCardTitle(screen: RenderResult) {
  return screen.locator.getByText(`Scheduled Tasks`);
}

export function getListItem(screen: RenderResult, taskId: string) {
  return screen.locator.getByTestId(`task-${taskId}`).getByRole('listitem');
}

export function getFlushTaskButton(screen: RenderResult, taskId: string) {
  return screen.locator
    .getByTestId(`task-${taskId}`)
    .getByRole('button', { name: 'Run Now' })
    .first();
}

export function getCancelTaskButton(screen: RenderResult, taskId: string) {
  return screen.locator
    .getByTestId(`task-${taskId}`)
    .getByRole('button', { name: 'Cancel Task' })
    .last();
}

export function getErrorDetailsButton(screen: RenderResult, taskId: string) {
  return screen.locator
    .getByTestId(`task-${taskId}`)
    .getByRole('listitem')
    .getByRole('button')
    .first();
}

export function getConfirmAlertBtn(screen: RenderResult) {
  return screen.locator.getByRole('button', { name: 'confirm' });
}

export async function slideOpen(screen: RenderResult, taskId: string) {
  const slidingItem = screen.locator
    .getByTestId(`task-${taskId}`)
    .element() as HTMLIonItemSlidingElement;
  await slidingItem.open('end');
}
