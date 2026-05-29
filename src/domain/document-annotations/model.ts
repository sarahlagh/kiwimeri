import { Sort } from '@/shared/utils/sort-filter/sort';
import { LocalChangeRow } from '../local-changes/model';

export const DOC_ANNOTATION_TABLE = 'document_annotation' as const;

export type DocAnnotationType = 'note'; // only one for now, to expand

export type DocAnnotationRow = {
  itemId: string;
  type: DocAnnotationType;
  createdAt: number;
  updatedAt: number;
  content: string;
  content_meta: string;
  plainText: string;
  order?: number;
  order_meta?: string;
  conflict?: string;
};

export const docAnnotationSchema = {
  itemId: { type: 'string' },
  type: { type: 'string' },
  createdAt: { type: 'number', default: 0 },
  updatedAt: { type: 'number', default: 0 },
  content: { type: 'string', default: '' },
  content_meta: { type: 'string' },
  plainText: { type: 'string', default: '' },
  order: { type: 'number', default: -1 },
  order_meta: { type: 'string' },
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

// notes specific stuff
export const sortBy = ['createdAt', 'order'] as const;
export type NotesSortType = (typeof sortBy)[number];
export type NotesSort = Sort<NotesSortType>;
