import { RenderResult } from 'vitest-browser-react';

export function getCardTitle(screen: RenderResult) {
  return screen.locator.getByText(`Scheduled Tasks`);
}

export function getListItem(screen: RenderResult, taskId: string) {
  return screen.locator.getByTestId(`task-${taskId}`).getByRole('listitem');
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

export function getAreYouSureConfirm(screen: RenderResult) {
  return screen.locator.getByText(`Are you sure?`);
}

export function getConfirmDeletionBtn(screen: RenderResult) {
  return screen.locator.getByRole('button', { name: 'confirm' });
}

export async function slideOpen(screen: RenderResult, taskId: string) {
  const slidingItem = screen.locator
    .getByTestId(`task-${taskId}`)
    .element() as HTMLIonItemSlidingElement;
  await slidingItem.open('end');
}
