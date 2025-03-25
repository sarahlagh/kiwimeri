export enum DocumentNodeType {
  folder = 'f',
  document = 'd',
  page = 'p'
}

export interface DocumentNode {
  id?: string;
  parent: string;
  type: 'f' | 'd' | 'p';
  title: string;
  content: string;
  created: number;
  updated: number;
  deleted: boolean;
}
