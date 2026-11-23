import { TableOf, WithId } from '@/core/db/types';

export function toArray<T>(table: TableOf<T>): WithId<T>[] {
  return Object.keys(table).map(itemId => ({
    ...table[itemId],
    id: itemId
  }));
}

export function toTable<T extends WithId<unknown>>(arg: T[]) {
  const table: TableOf<T> = {};
  arg.forEach(a => {
    const id = a.id;
    table[id] = { ...a, id: undefined };
  });
  return table;
}
