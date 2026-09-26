import App from '@/App';
import fetchNotificationsQuery from '@/app/queries/fetchNotificationsQuery';
import { notifsSvc } from '@/core/notifications/notifications.service';
import { describe, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

describe('App', () => {
  test('renders without crashing', async () => {
    const screen = await render(<App />);

    expect(screen.baseElement).toBeDefined();
  });

  test('renders with notifications', async () => {
    notifsSvc.send('info', 'test notification');
    const screen = await render(<App />);

    expect(screen.baseElement).toBeDefined();
    // check that a toast is visible
    await expect
      .element(
        screen.locator.getByRole('status').getByText(`test notification`)
      )
      .toBeVisible();
  });

  test('renders without acknowledged notifications', async () => {
    const notifId = notifsSvc.send('info', 'test notification')!;
    notifsSvc.ack(notifId);
    expect(fetchNotificationsQuery.getResults({ all: true })).toHaveLength(1);

    const screen = await render(<App />);

    expect(screen.baseElement).toBeDefined();
    await expect
      .element(
        screen.locator.getByRole('status').getByText(`test notification`)
      )
      .not.toBeInTheDocument();
  });
});
