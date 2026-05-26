import { Sort } from '@/shared/utils/sort-filter/sort';
import { LocalChangeRow } from '../local-changes/model';

export type CommentRow = {
  itemId: string;
  createdAt: number;
  updatedAt: number;
  content: string;
  content_meta: string;
  plainText: string;
  order?: number;
  order_meta?: string;
  conflict?: string;
};

export const commentSchema = {
  itemId: { type: 'string' },
  createdAt: { type: 'number', default: 0 },
  updatedAt: { type: 'number', default: 0 },
  content: { type: 'string', default: '' },
  content_meta: { type: 'string' },
  plainText: { type: 'string', default: '' },
  order: { type: 'number', default: -1 },
  order_meta: { type: 'string' },
  conflict: { type: 'string' }
} as const satisfies Record<keyof CommentRow, unknown>;

export const sortBy = ['createdAt', 'order'] as const;
export type CommentSortType = (typeof sortBy)[number];
export type CommentSort = Sort<CommentSortType>;

export type SyncableComment = {
  id: string;
} & Omit<CommentRow, 'plainText'>;

type CommentUpdate = Pick<CommentRow, 'content' | 'order'>;
export type CommentLocalChange = LocalChangeRow<CommentUpdate>;

export type CommentUpdatableFieldEnum = keyof Required<CommentUpdate>;

export const CommentUpdatableFields: CommentUpdatableFieldEnum[] = [
  'content',
  'order'
];
export const CommentUpdatableConflictFields: CommentUpdatableFieldEnum[] = [
  'content'
];
