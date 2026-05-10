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
