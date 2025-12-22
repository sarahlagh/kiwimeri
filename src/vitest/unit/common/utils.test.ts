import { dateToStr } from '@/common/utils';
import { vi } from 'vitest';

describe('utils test', () => {
  it('should format with dateToStr', () => {
    vi.useFakeTimers();
    const date = new Date(1766347671704);
    expect(dateToStr('iso', date.getTime())).toBe('2025-12-21-20-07-51');
    expect(dateToStr('date', date.getTime())).toBe('21/12/2025');
    expect(dateToStr('time', date.getTime())).toBe('20:07:51');
    expect(dateToStr('datetime', date.getTime())).toBe('21/12/2025 20:07:51');
    vi.useRealTimers();
  });

  it('should format with dateToStr, relative', () => {
    vi.useFakeTimers();
    const base = Date.now();
    const baseStr = dateToStr('datetime', base);
    const date = new Date(base);

    vi.setSystemTime(base);
    expect(dateToStr('relative', date.getTime())).toBe(
      `${baseStr} 0 second ago`
    );

    vi.setSystemTime(base + 100);
    expect(dateToStr('relative', date.getTime())).toBe(
      `${baseStr} 1 second ago`
    );

    vi.setSystemTime(base + 55000);
    expect(dateToStr('relative', date.getTime())).toBe(
      `${baseStr} 55 seconds ago`
    );

    vi.setSystemTime(base + 55000);
    expect(dateToStr('relative', date.getTime())).toBe(
      `${baseStr} 55 seconds ago`
    );

    vi.setSystemTime(base + 60000);
    expect(dateToStr('relative', date.getTime())).toBe(
      `${baseStr} 1 minute ago`
    );

    vi.setSystemTime(base + 60500);
    expect(dateToStr('relative', date.getTime())).toBe(
      `${baseStr} 2 minutes ago`
    );

    vi.setSystemTime(base + 67000);
    expect(dateToStr('relative', date.getTime())).toBe(
      `${baseStr} 2 minutes ago`
    );

    vi.setSystemTime(base + 3360000);
    expect(dateToStr('relative', date.getTime())).toBe(
      `${baseStr} 56 minutes ago`
    );

    vi.setSystemTime(base + 3600000);
    expect(dateToStr('relative', date.getTime())).toBe(
      `${baseStr} 60 minutes ago`
    );

    vi.setSystemTime(base + 3600000);
    expect(dateToStr('relative', date.getTime())).toBe(
      `${baseStr} 60 minutes ago`
    );

    vi.setSystemTime(base + 3660000);
    expect(dateToStr('relative', date.getTime())).toBe(
      `${baseStr} 61 minutes ago`
    );

    vi.setSystemTime(base + 7080000);
    expect(dateToStr('relative', date.getTime())).toBe(
      `${baseStr} 118 minutes ago`
    );

    vi.setSystemTime(base + 7200000);
    expect(dateToStr('relative', date.getTime())).toBe(
      `${baseStr} 2 hours ago`
    );

    vi.setSystemTime(base + 82800000);
    expect(dateToStr('relative', date.getTime())).toBe(
      `${baseStr} 23 hours ago`
    );

    vi.setSystemTime(base + 86400000);
    expect(dateToStr('relative', date.getTime())).toBe(`${baseStr} yesterday`);

    vi.setSystemTime(base + 172800000);
    expect(dateToStr('relative', date.getTime())).toBe(`${baseStr} 2 days ago`);

    vi.setSystemTime(base + 518400000);
    expect(dateToStr('relative', date.getTime())).toBe(`${baseStr} 6 days ago`);

    vi.setSystemTime(base + 604800000);
    expect(dateToStr('relative', date.getTime())).toBe(`${baseStr}`);

    vi.useRealTimers();
  });
});
