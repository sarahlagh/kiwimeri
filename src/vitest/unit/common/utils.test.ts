import { dateLocale, dateToStr } from '@/common/date-utils';
import { vi } from 'vitest';

const locale = dateLocale;

describe('utils test', () => {
  it('should format with dateToStr', () => {
    vi.useFakeTimers();
    const date = new Date(1766347671704);
    expect(dateToStr('iso', date.getTime(), locale)).toBe(
      '2025-12-21-21-07-51'
    );
    expect(dateToStr('date', date.getTime(), locale)).toBe('21/12/2025');
    expect(dateToStr('time', date.getTime(), locale)).toBe('20:07:51');
    expect(dateToStr('datetime', date.getTime(), locale)).toBe(
      '21/12/2025 20:07:51'
    );
    vi.useRealTimers();
  });

  it('should format with dateToStr, relative', () => {
    vi.useFakeTimers();
    const base = Date.now();
    const baseStr = dateToStr('datetime', base, locale);
    const date = new Date(base);

    vi.setSystemTime(base);
    expect(dateToStr('relative', date.getTime(), locale)).toBe(
      `${baseStr} 0 seconds ago`
    );
    expect(dateToStr('relative', date.getTime(), locale)).toBe(
      `${baseStr} 0 seconds ago`
    );

    vi.setSystemTime(base + 1000);
    expect(dateToStr('relative', date.getTime(), locale)).toBe(
      `${baseStr} 1 second ago`
    );

    vi.setSystemTime(base + 55000);
    expect(dateToStr('relative', date.getTime(), locale)).toBe(
      `${baseStr} 55 seconds ago`
    );

    vi.setSystemTime(base + 55000);
    expect(dateToStr('relative', date.getTime(), locale)).toBe(
      `${baseStr} 55 seconds ago`
    );

    vi.setSystemTime(base + 60000);
    expect(dateToStr('relative', date.getTime(), locale)).toBe(
      `${baseStr} 1 minute ago`
    );

    vi.setSystemTime(base + 60100);
    expect(dateToStr('relative', date.getTime(), locale)).toBe(
      `${baseStr} 1 minute ago`
    );

    vi.setSystemTime(base + 110000);
    expect(dateToStr('relative', date.getTime(), locale)).toBe(
      `${baseStr} 2 minutes ago`
    );

    vi.setSystemTime(base + 3360000);
    expect(dateToStr('relative', date.getTime(), locale)).toBe(
      `${baseStr} 56 minutes ago`
    );

    vi.setSystemTime(base + 3600000);
    expect(dateToStr('relative', date.getTime(), locale)).toBe(
      `${baseStr} 1 hour ago`
    );

    vi.setSystemTime(base + 3660000);
    expect(dateToStr('relative', date.getTime(), locale)).toBe(
      `${baseStr} 1 hour ago`
    );

    vi.setSystemTime(base + 7080000);
    expect(dateToStr('relative', date.getTime(), locale)).toBe(
      `${baseStr} 2 hours ago`
    );

    vi.setSystemTime(base + 7200000);
    expect(dateToStr('relative', date.getTime(), locale)).toBe(
      `${baseStr} 2 hours ago`
    );

    vi.setSystemTime(base + 82800000);
    expect(dateToStr('relative', date.getTime(), locale)).toBe(
      `${baseStr} 23 hours ago`
    );

    vi.setSystemTime(base + 86400000);
    expect(dateToStr('relative', date.getTime(), locale)).toBe(
      `${baseStr} 1 day ago`
    );

    vi.setSystemTime(base + 172800000);
    expect(dateToStr('relative', date.getTime(), locale)).toBe(
      `${baseStr} 2 days ago`
    );

    vi.setSystemTime(base + 518400000);
    expect(dateToStr('relative', date.getTime(), locale)).toBe(
      `${baseStr} 6 days ago`
    );

    vi.setSystemTime(base + 604800000);
    expect(dateToStr('relative', date.getTime(), locale)).toBe(`${baseStr}`);

    vi.useRealTimers();
  });
});
