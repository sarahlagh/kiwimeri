import { MetaField, metaSchemaDefault, WithId } from '@/core/db/types';
import { LocalChangeRow } from '../synchronization/local-changes';
import { ContentAddition } from './document-content';

export type DocAnnotationType = 'note'; // only one for now, to expand

export type DocAnnotationRow = {
  parentId: string;
  type: DocAnnotationType;
  createdAt: number;
  updatedAt: number;
  order?: number;
  order_meta?: MetaField;
  conflictId?: string;
};

export const docAnnotationSchema = {
  parentId: { type: 'string' },
  type: { type: 'string' },
  createdAt: { type: 'number', default: 0 },
  updatedAt: { type: 'number', default: 0 },
  order: { type: 'number', default: -1 },
  order_meta: { type: 'object', default: metaSchemaDefault },
  conflictId: { type: 'string' }
} as const satisfies Record<keyof DocAnnotationRow, unknown>;

export type BaseDocAnnotation = DocAnnotationRow & ContentAddition;
export type DocAnnotation = WithId<BaseDocAnnotation>;

type DocAnnotationUpdate = Pick<BaseDocAnnotation, 'content' | 'order'>;
export type DocAnnotationLocalChange = LocalChangeRow<DocAnnotationUpdate>;

export type DocAnnotationUpdatableFieldEnum =
  keyof Required<DocAnnotationUpdate>;

export const DocAnnotationUpdatableFields: DocAnnotationUpdatableFieldEnum[] = [
  'content',
  'order'
];
export const DocAnnotationUpdatableConflictFields: DocAnnotationUpdatableFieldEnum[] =
  ['content'];
