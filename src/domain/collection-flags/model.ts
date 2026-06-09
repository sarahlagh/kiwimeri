export type CollectionItemFlags = Partial<NotebookFlags>;

export type NotebookFlags = {
  statsEnabled?: boolean;
};

export const defaultNotebookFlags: Required<NotebookFlags> = {
  statsEnabled: false
};
