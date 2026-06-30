export function genericReorder(
  from: number,
  to: number,
  cb: (idx: number, order: number) => void
) {
  if (from < to) {
    for (let i = from + 1; i < to + 1; i++) {
      cb(i, i - 1);
    }
  } else {
    for (let i = to; i < from; i++) {
      cb(i, i + 1);
    }
  }
  cb(from, to);
}
