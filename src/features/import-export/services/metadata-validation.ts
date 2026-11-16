import { CollectionItemType, itemTypes } from '@/domain/collection/collection';
import { docSortBy } from '@/domain/collection/collection-settings';
import { RootZipMetadata, ZipMetadata } from '../model/model-export';

enum Versions {
  INITIAL_0 = 0,
  WITH_ACTIVITY_AT_1 = 1
}
/**
 * <=0.4.8 => settings.sort.by accepts updatedAt, schemaVersion is undefined (schemaVersion=0)
 *   0.5.0 => settings.sort.by accepts lastActivityAt, auto converts updatedAt (schemaVersion=1)
 */
export const IMPORT_EXPORT_SCHEMA_VERSION = Versions.WITH_ACTIVITY_AT_1; // increment each breaking change

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
    !Object.values([...docSortBy, 'updatedAt']).includes(sort.by as any)
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

function validateMetadataFile(value: unknown): asserts value is ZipMetadata {
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
}

export function validateRootMetadataFile(
  value: unknown
): asserts value is RootZipMetadata {
  if (!isObject(value) || Array.isArray(value)) {
    throw new Error('parsing error: metadata must be an object');
  }
  if (value.schemaVersion === undefined) {
    value.schemaVersion = Versions.INITIAL_0;
  }
  if (typeof value.schemaVersion !== 'number') {
    throw new Error('parsing error: schemaVersion must be a number');
  }
  validateMetadataFile(value);
  if ('settings' in value) {
    validateMetadataSettings(value.settings);
  }
  if ('files' in value) {
    if (!isObject(value.files) || Array.isArray(value.files)) {
      throw new Error('parsing error: files must be an object');
    }
    Object.keys(value.files).forEach(f => {
      validateMetadataFile((value.files as never)[f]);
    });
  }
}
