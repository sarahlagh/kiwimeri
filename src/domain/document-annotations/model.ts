import { MetaField, metaSchemaDefault } from '@/core/db/types';
import { LocalChangeRow } from '../local-changes/model';

export type DocAnnotationType = 'note'; // only one for now, to expand

export type DocAnnotationRow = {
  itemId: string;
  type: DocAnnotationType;
  createdAt: number;
  updatedAt: number;
  content: string;
  content_meta: MetaField;
  plainText: string;
  order?: number;
  order_meta?: MetaField;
  conflict?: string;
};

export const docAnnotationSchema = {
  itemId: { type: 'string' },
  type: { type: 'string' },
  createdAt: { type: 'number', default: 0 },
  updatedAt: { type: 'number', default: 0 },
  content: { type: 'string', default: '' },
  content_meta: { type: 'object', default: metaSchemaDefault },
  plainText: { type: 'string', default: '' },
  order: { type: 'number', default: -1 },
  order_meta: { type: 'object', default: metaSchemaDefault },
  conflict: { type: 'string' }
} as const satisfies Record<keyof DocAnnotationRow, unknown>;

export type SyncableAnnotation = {
  id: string;
} & Omit<DocAnnotationRow, 'plainText'>;

type DocAnnotationUpdate = Pick<DocAnnotationRow, 'content' | 'order'>;
export type DocAnnotationLocalChange = LocalChangeRow<DocAnnotationUpdate>;

export type DocAnnotationUpdatableFieldEnum =
  keyof Required<DocAnnotationUpdate>;

export const DocAnnotationUpdatableFields: DocAnnotationUpdatableFieldEnum[] = [
  'content',
  'order'
];
export const DocAnnotationUpdatableConflictFields: DocAnnotationUpdatableFieldEnum[] =
  ['content'];
