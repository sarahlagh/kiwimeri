import { Sort } from '@/shared/utils/sort';

export type CommentRow = {
  itemId: string;
  createdAt: number;
  updatedAt: number;
  content: string;
  plainText: string;
  order?: number;
  // TODO pinned, parentId, order/position
};

export const commentSchema = {
  itemId: { type: 'string' },
  createdAt: { type: 'number', default: 0 },
  updatedAt: { type: 'number', default: 0 },
  content: { type: 'string', default: '' },
  plainText: { type: 'string', default: '' },
  order: { type: 'number', default: 0 }
} as const satisfies Record<keyof CommentRow, unknown>;

export type CommentResult = {
  id: string;
} & CommentRow;

export const sortBy = ['createdAt', 'updatedAt', 'order'] as const;
export type CommentSortType = (typeof sortBy)[number];
export type CollectionItemSort = Sort<CommentSortType>;
