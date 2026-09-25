import fetchNotificationsQuery from '@/app/queries/fetchNotificationsQuery';
import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { store } from '@/core/db/store';
import { SpaceTables, StoreTables } from '@/core/db/store-constants';
import { AppNotificationResult } from '@/core/notifications/notifications';
import { notifsSvc } from '@/core/notifications/notifications.service';
import collectionService from '@/domain/collection/collection.service';
import { annotsService } from '@/domain/collection/doc-annotations.service';
import { Notifications } from '@/features/notifications-ui';
import { dateToStr } from '@/shared/misc/date-utils';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render, RenderResult } from 'vitest-browser-react';
import { TestingProvider } from '../../TestingProvider';
import {
  getAckBtn,
  getInfoAlert,
  getInfoAlertAcknowledgedAt,
  getInfoAlertContext,
  getInfoAlertOpenDocumentBtn,
  getInfoButton,
  getListItem,
  getUnAckBtn,
  slideOpen
} from './Notifications.locators';

async function expectInList(
  screen: RenderResult,
  notifs: AppNotificationResult[]
) {
  for (const notif of notifs) {
    const listitem = getListItem(screen, notif.id);
    await expect.element(listitem).toBeInTheDocument();
    await expect
      .element(listitem.getByText(notif.message, { exact: true }))
      .toBeVisible();
  }
}

describe('Notifications', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchNotificationsQuery.initQuery({ all: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    fetchNotificationsQuery.close();
  });

  test('renders an empty card', async () => {
    const screen = await render(<Notifications />, {
      wrapper: TestingProvider
    });
    expect(screen.baseElement).toBeDefined();
  });

  test('renders acknowledged and non-acknowledged notifications', async () => {
    const notifId = notifsSvc.send('error', 'test error notif')!;
    notifsSvc.send('warning', 'test warning notif');
    notifsSvc.send('info', 'test info notif');
    notifsSvc.ack(notifId);
    const notifs = fetchNotificationsQuery.getResults({ all: true });
    expect(notifs).toHaveLength(3);

    const screen = await render(<Notifications />, {
      wrapper: TestingProvider
    });
    expect(screen.baseElement).toBeDefined();
    await expectInList(screen, notifs);
  });

  test('click on info shows context and acknowledged timestamp', async () => {
    const notifId = notifsSvc.send('error', 'test error notif', {
      ctx: 'test'
    })!;
    vi.advanceTimersByTime(100);
    const now = Date.now();
    notifsSvc.ack(notifId);
    const notifs = fetchNotificationsQuery.getResults({ all: true });
    expect(notifs).toHaveLength(1);
    const notif = notifs[0];

    const screen = await render(<Notifications />, {
      wrapper: TestingProvider
    });
    await expectInList(screen, notifs);

    const infoBtn = getInfoButton(screen, notif.id);
    await expect.element(infoBtn).toBeInTheDocument();

    await infoBtn.click();

    await expect.element(getInfoAlert(screen)).toBeInTheDocument();
    const acknowledgedAt = getInfoAlertAcknowledgedAt(screen);
    const context = getInfoAlertContext(screen);

    await expect.element(acknowledgedAt).toBeInTheDocument();
    await expect.element(context).toBeInTheDocument();
    expect((acknowledgedAt.element() as HTMLElement).textContent).toBe(
      `Acknowledged at: ${dateToStr('datetime', now)} </br> Context: {"ctx":"test"}`
    );
  });

  test('click on info correctly renders missing acknowledged timestamp', async () => {
    notifsSvc.send('error', 'test error notif', {
      ctx: 'test'
    });
    const notifs = fetchNotificationsQuery.getResults({ all: true });
    const notif = notifs[0];

    const screen = await render(<Notifications />, {
      wrapper: TestingProvider
    });
    await getInfoButton(screen, notif.id).click();

    await expect.element(getInfoAlert(screen)).toBeInTheDocument();
    const acknowledgedAt = getInfoAlertAcknowledgedAt(screen);

    expect((acknowledgedAt.element() as HTMLElement).textContent).toBe(
      `Acknowledged at: never </br> Context: {"ctx":"test"}`
    );
  });

  test('click on info correctly renders missing context', async () => {
    notifsSvc.send('error', 'test error notif');
    const notifs = fetchNotificationsQuery.getResults({ all: true });
    const notif = notifs[0];

    const screen = await render(<Notifications />, {
      wrapper: TestingProvider
    });
    await getInfoButton(screen, notif.id).click();

    await expect.element(getInfoAlert(screen)).toBeInTheDocument();
    const acknowledgedAt = getInfoAlertAcknowledgedAt(screen);

    expect((acknowledgedAt.element() as HTMLElement).textContent).toBe(
      `Acknowledged at: never </br> Context: none`
    );
  });

  test('click on info offers Open Document button if context allows it (document)', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    notifsSvc.send('error', 'test error notif', {
      rowId: docId,
      on: SpaceTables.Collection
    });
    const notifs = fetchNotificationsQuery.getResults({ all: true });
    const notif = notifs[0];

    const screen = await render(<Notifications />, {
      wrapper: TestingProvider
    });
    await getInfoButton(screen, notif.id).click();

    const openDocumentBtn = getInfoAlertOpenDocumentBtn(screen);
    await expect.element(openDocumentBtn).toBeInTheDocument();

    await openDocumentBtn.click();

    expect(window.navigateToList).toHaveLength(1);
    expect(window.navigateToList[0]).toBe(
      `/document?folder=0&document=${docId}`
    );
  });

  test('click on info offers Open Document button if context allows it (annotation)', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const annotId = annotsService.addNote(docId);

    notifsSvc.send('error', 'test error notif', {
      rowId: annotId,
      on: SpaceTables.Annotations
    });
    const notifs = fetchNotificationsQuery.getResults({ all: true });
    const notif = notifs[0];

    const screen = await render(<Notifications />, {
      wrapper: TestingProvider
    });
    await getInfoButton(screen, notif.id).click();

    const openDocumentBtn = getInfoAlertOpenDocumentBtn(screen);
    await expect.element(openDocumentBtn).toBeInTheDocument();
    await openDocumentBtn.click();

    expect(window.navigateToList).toHaveLength(1);
    expect(window.navigateToList[0]).toBe(
      `/document?folder=0&document=${docId}`
    );
  });

  test('click on info does not offer Open Document button if context missing', async () => {
    notifsSvc.send('error', 'test error notif');
    const notifs = fetchNotificationsQuery.getResults({ all: true });
    const notif = notifs[0];

    const screen = await render(<Notifications />, {
      wrapper: TestingProvider
    });
    await getInfoButton(screen, notif.id).click();

    const openDocumentBtn = getInfoAlertOpenDocumentBtn(screen);
    await expect.element(openDocumentBtn).not.toBeInTheDocument();
  });

  test('click on info does not offer Open Document button if context has no relevant info', async () => {
    notifsSvc.send('error', 'test error notif', { ctx: 'test' });
    const notifs = fetchNotificationsQuery.getResults({ all: true });
    const notif = notifs[0];

    const screen = await render(<Notifications />, {
      wrapper: TestingProvider
    });
    await getInfoButton(screen, notif.id).click();

    const openDocumentBtn = getInfoAlertOpenDocumentBtn(screen);
    await expect.element(openDocumentBtn).not.toBeInTheDocument();
  });

  test('click on info does not offer Open Document button if context "rowId" value is missing', async () => {
    notifsSvc.send('error', 'test error notif', {
      on: SpaceTables.Collection
    });
    const notifs = fetchNotificationsQuery.getResults({ all: true });
    const notif = notifs[0];

    const screen = await render(<Notifications />, {
      wrapper: TestingProvider
    });
    await getInfoButton(screen, notif.id).click();

    const openDocumentBtn = getInfoAlertOpenDocumentBtn(screen);
    await expect.element(openDocumentBtn).not.toBeInTheDocument();
  });

  test('click on info does not offer Open Document button if context "on" value is wrong', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    notifsSvc.send('error', 'test error notif', {
      rowId: docId,
      on: SpaceTables.Tasks
    });
    const notifs = fetchNotificationsQuery.getResults({ all: true });
    const notif = notifs[0];

    const screen = await render(<Notifications />, {
      wrapper: TestingProvider
    });
    await getInfoButton(screen, notif.id).click();

    const openDocumentBtn = getInfoAlertOpenDocumentBtn(screen);
    await expect.element(openDocumentBtn).not.toBeInTheDocument();
  });

  test('slide to acknowlege a non-acknowledged notification', async () => {
    notifsSvc.send('error', 'test error notif');

    const notifs = fetchNotificationsQuery.getResults({ all: true });
    expect(notifs).toHaveLength(1);
    const notifId = notifs[0].id;

    const screen = await render(<Notifications />, {
      wrapper: TestingProvider
    });

    await slideOpen(screen, notifId);

    await expect.element(getUnAckBtn(screen, notifId)).not.toBeInTheDocument();
    const ackBtn = getAckBtn(screen, notifId);
    await expect.element(ackBtn).toBeInTheDocument();

    await ackBtn.click();
    await expect.element(getUnAckBtn(screen, notifId)).toBeInTheDocument();
    expect(store.getCell(StoreTables.Notifications, notifId, 'ackAt')).toBe(
      Date.now()
    );
  });

  test('slide to un-acknowlege an acknowledged notification', async () => {
    const notifId = notifsSvc.send('error', 'test error notif')!;
    notifsSvc.ack(notifId);
    vi.advanceTimersByTime(100);

    const screen = await render(<Notifications />, {
      wrapper: TestingProvider
    });

    await slideOpen(screen, notifId);

    await expect.element(getAckBtn(screen, notifId)).not.toBeInTheDocument();
    const unAckBtn = getUnAckBtn(screen, notifId);
    await expect.element(unAckBtn).toBeInTheDocument();

    await unAckBtn.click();
    await expect.element(getAckBtn(screen, notifId)).toBeInTheDocument();
    expect(
      store.getCell(StoreTables.Notifications, notifId, 'ackAt')
    ).toBeUndefined();
  });
});
