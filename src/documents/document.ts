export enum DocumentNodeType {
  folder = 'f',
  document = 'd',
  page = 'p'
}

export type DocumentNodeTypeValues = 'f' | 'd' | 'p';

export interface DocumentNode {
  id?: string;
  parent: string;
  type: DocumentNodeTypeValues;
  title: string;
  content: string;
  created: number;
  updated: number;
  deleted: boolean;
}

export type DocumentNodeResult = Required<
  Pick<
    DocumentNode,
    'id' | 'parent' | 'title' | 'type' | 'created' | 'updated' | 'deleted'
  >
>;
