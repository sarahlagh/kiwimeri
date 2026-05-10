import { CommentRow } from '@/domain/comments/model';
import { Sort } from '@/shared/utils/sort';

export type CommentResult = {
  id: string;
} & Pick<CommentRow, 'createdAt' | 'order'>;

export const sortBy = ['createdAt', 'order'] as const;
export type CommentSortType = (typeof sortBy)[number];
export type CommentSort = Sort<CommentSortType>;
