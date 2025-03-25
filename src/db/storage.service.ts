import { createIndexedDbPersister } from 'tinybase/persisters/persister-indexed-db/with-schemas';
import { Persister } from 'tinybase/persisters/with-schemas';
import { CellSchema, createStore, Store } from 'tinybase/store/with-schemas';
import { DocumentNode } from '../documents/document';

type documentKeyEnum = keyof Required<Omit<DocumentNode, 'id'>>;
export type StoreType = [
  {
    documents: {
      [cellId in documentKeyEnum]: CellSchema;
    };
  },
  {
    theme: { type: 'string'; default: 'dark' };
    currentFolder: { type: 'string'; default: 'home' };
  }
];

class StorageService {
  private store!: Store<StoreType>;
  private persister!: Persister<StoreType>;

  public constructor() {
    this.store = createStore()
      .setTablesSchema({
        documents: {
          title: { type: 'string' } as CellSchema,
          parent: { type: 'string' } as CellSchema,
          type: { type: 'string' } as CellSchema,
          content: { type: 'string' } as CellSchema,
          created: { type: 'number' } as CellSchema,
          updated: { type: 'number' } as CellSchema,
          deleted: { type: 'boolean' } as CellSchema
        }
      })
      .setValuesSchema({
        theme: { type: 'string', default: 'dark' },
        currentFolder: { type: 'string', default: 'home' }
      });

    this.persister = createIndexedDbPersister(this.store, 'kiwimeriAppStore');
  }

  public async start() {
    await this.persister.load();
    await this.persister.startAutoSave();
  }

  public getStore() {
    return this.store;
  }
}

const storageService = new StorageService();
export default storageService;
