import { docSortBy } from '@/domain/collection-settings/model';
import { CollectionItemType, itemTypes } from '@/domain/collection/model';
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

function validateMetadataSettings(
  settings: unknown
): asserts settings is ZipMetadata['settings'] {
  if (!isObject(settings)) {
    throw new Error('parsing error: settings must be an object');
  }
  if (!('sort' in settings) || !isObject(settings.sort)) {
    throw new Error('parsing error: settings.sort must be an object');
  }
  const sort = settings.sort;
  if (
    !('by' in sort) ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    !Object.values(docSortBy).includes(sort.by as any)
  ) {
    throw new Error('parsing error: settings.sort.by must be a sort field');
  }
  if (!('descending' in sort) || typeof sort.descending !== 'boolean') {
    throw new Error(
      'parsing error: settings.sort.descending must be a boolean'
    );
  }
  if (sort.by === 'order' && sort.descending !== false) {
    throw new Error(
      'parsing error: settings.sort.descending must be a false for settings.sort.by = order'
    );
  }
}

export function validateMetadataFile(
  value: unknown,
  root = true
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
  if ('createdAt' in value && typeof value.createdAt !== 'number') {
    throw new Error('parsing error: createdAt is not a number');
  }
  if ('updatedAt' in value && typeof value.updatedAt !== 'number') {
    throw new Error('parsing error: updatedAt is not a number');
  }
  if ('tags' in value && !isStringArray(value.tags)) {
    throw new Error('parsing error: tags must be an array of strings');
  }
  if ('order' in value && typeof value.order !== 'number') {
    throw new Error('parsing error: order is not a number');
  }
  if (root && 'settings' in value) {
    validateMetadataSettings(value.settings);
  }
  if (root && 'files' in value) {
    if (!isObject(value.files) || Array.isArray(value.files)) {
      throw new Error('parsing error: files must be an object');
    }
    Object.keys(value.files).forEach(f => {
      validateMetadataFile((value.files as never)[f], false);
    });
  }
}
