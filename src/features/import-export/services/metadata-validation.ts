import { CollectionItemType, itemTypes, sortBy } from '@/collection/collection';
import { ZipMetadata } from '../model/model-export';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(v => typeof v === 'string');
}

function isEnumValue<T extends string>(
  value: unknown,
  enumObj: Record<string, T>
): value is T {
  return Object.values(enumObj).includes(value as T);
}

function validateMetadataDisplay(
  display_opts: unknown
): asserts display_opts is ZipMetadata['display_opts'] {
  if (!isObject(display_opts)) {
    throw new Error('parsing error: display_opts must be an object');
  }
  if (!('sort' in display_opts) || !isObject(display_opts.sort)) {
    throw new Error('parsing error: display_opts.sort must be an object');
  }
  const sort = display_opts.sort;
  if (
    !('by' in sort) ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    !Object.values(sortBy).includes(sort.by as any)
  ) {
    throw new Error('parsing error: display_opts.sort.by must be a sort field');
  }
  if (!('descending' in sort) || typeof sort.descending !== 'boolean') {
    throw new Error(
      'parsing error: display_opts.sort.descending must be a boolean'
    );
  }
  if (sort.by === 'order' && sort.descending !== false) {
    throw new Error(
      'parsing error: display_opts.sort.descending must be a false for display_opts.sort.by = order'
    );
  }
}

export function validateMetadataFile(
  value: unknown
): asserts value is ZipMetadata {
  if (!isObject(value) || Array.isArray(value)) {
    throw new Error('parsing error: metadata must be an object');
  }
  if ('format' in value && value.format !== 'markdown') {
    throw new Error('parsing error: format only accepts values: markdown');
  }
  if ('type' in value && !isEnumValue(value.type, CollectionItemType)) {
    throw new Error(`parsing error: type only accepts values: ${itemTypes}`);
  }
  if ('title' in value && typeof value.title !== 'string') {
    throw new Error('parsing error: title is not a string');
  }
  if ('created' in value && typeof value.created !== 'number') {
    throw new Error('parsing error: created is not a number');
  }
  if ('updated' in value && typeof value.updated !== 'number') {
    throw new Error('parsing error: updated is not a number');
  }
  if ('tags' in value && !isStringArray(value.tags)) {
    throw new Error('parsing error: tags must be an array of strings');
  }
  if ('order' in value && typeof value.order !== 'number') {
    throw new Error('parsing error: order is not a number');
  }
  if ('display_opts' in value) {
    validateMetadataDisplay(value.display_opts);
  }
  if ('files' in value && !isObject(value.files)) {
    throw new Error('parsing error: files must be an object');
  }
}
