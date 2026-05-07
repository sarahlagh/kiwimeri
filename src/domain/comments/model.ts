export type CommentRow = {
  itemId: string;
  createdAt: number;
  updatedAt: number;
  content: string;
  plainText: string;
  // TODO pinned, parentId, order/position
};

export type CommentResult = {
  id: string;
  //   content: SerializedEditorState;
} & CommentRow;
