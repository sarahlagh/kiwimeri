import { AnyData } from '@/db/types/store-types';

export function genericReorder(
  items: AnyData[],
  from: number,
  to: number,
  cb: (idx: number, order: number) => void
) {
  const upperLimit = to < items.length - 1 ? to + 1 : items.length;
  if (from < to) {
    for (let i = from + 1; i < upperLimit; i++) {
      cb(i, i - 1);
    }
  } else {
    for (let i = to; i < from; i++) {
      cb(i, i + 1);
    }
  }
  cb(from < items.length ? from : items.length - 1, to);
}
