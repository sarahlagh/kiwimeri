import { createIndexedDbPersister } from 'tinybase/persisters/persister-indexed-db/with-schemas';
import { Persister } from 'tinybase/persisters/with-schemas';
import {
  CellSchema,
  createStore,
  NoValuesSchema,
  Store
} from 'tinybase/store/with-schemas';
import { Document } from '../documents/document';

type documentKeyEnum = keyof Required<Omit<Document, 'id'>>;
export type StoreType = [
  {
    documents: {
      [cellId in documentKeyEnum]: CellSchema;
    };
  },
  NoValuesSchema
];

class StorageService {
  private store!: Store<StoreType>;
  private persister!: Persister<StoreType>;

  public constructor() {
    this.store = createStore().setTablesSchema({
      documents: {
        title: { type: 'string' } as CellSchema,
        content: { type: 'string' } as CellSchema,
        created: { type: 'number' } as CellSchema,
        updated: { type: 'number' } as CellSchema
      }
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
