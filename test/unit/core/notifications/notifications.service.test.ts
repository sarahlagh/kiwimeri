import fetchNotificationsQuery from '@/app/queries/fetchNotificationsQuery';
import { notifsSvc } from '@/core/notifications/notifications.service';

describe('app notifications', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('notifications are queued and unique', () => {
    notifsSvc.send('info', 'test info notif')!;
    notifsSvc.send('info', 'test info notif')!;
    notifsSvc.send('warning', 'test warning notif')!;
    notifsSvc.send('warning', 'test warning notif')!;
    notifsSvc.send('error', 'test error notif')!;
    notifsSvc.send('error', 'test error notif')!;
    expect(fetchNotificationsQuery.getResults({})).toHaveLength(6);
  });

  it('un-acknowledge notifications are always returned by the query', () => {
    notifsSvc.send('info', 'test info notif')!;
    expect(fetchNotificationsQuery.getResults({})).toHaveLength(1);
    expect(fetchNotificationsQuery.getResults({ all: false })).toHaveLength(1);
    expect(fetchNotificationsQuery.getResults({ all: true })).toHaveLength(1);
  });

  it('acknowledged notifications are not returned by the query unless all=true', () => {
    const notifId = notifsSvc.send('info', 'test info notif')!;
    notifsSvc.ack(notifId);
    expect(fetchNotificationsQuery.getResults({})).toHaveLength(0);
    expect(fetchNotificationsQuery.getResults({ all: false })).toHaveLength(0);
    expect(fetchNotificationsQuery.getResults({ all: true })).toHaveLength(1);
  });

  it('gc should clear acknowledged notifications', () => {
    const notifId = notifsSvc.send('info', 'test info notif')!;
    notifsSvc.ack(notifId);
    vi.advanceTimersByTime(3600_000 + 1000);
    notifsSvc.gc();
    expect(fetchNotificationsQuery.getResults({ all: true })).toHaveLength(0);
  });

  it('gc should not clear acknowledged notifications that are too recent', () => {
    const notifId = notifsSvc.send('info', 'test info notif')!;
    notifsSvc.ack(notifId);
    vi.advanceTimersByTime(100);
    notifsSvc.gc();
    expect(fetchNotificationsQuery.getResults({ all: true })).toHaveLength(1);
  });

  it('gc should not clear un-acknowledged notifications', () => {
    notifsSvc.send('info', 'test info notif');
    vi.advanceTimersByTime(3600_000);
    notifsSvc.gc();
    expect(fetchNotificationsQuery.getResults({ all: true })).toHaveLength(1);
  });

  it('unAck should exclude notif from gc', () => {
    const notifId = notifsSvc.send('info', 'test info notif')!;
    notifsSvc.ack(notifId);
    vi.advanceTimersByTime(3600_000);
    notifsSvc.unAck(notifId);
    notifsSvc.gc();
    expect(fetchNotificationsQuery.getResults({ all: true })).toHaveLength(1);
  });
});
