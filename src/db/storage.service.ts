/* eslint-disable @typescript-eslint/no-empty-object-type */
import { createIndexedDbPersister } from 'tinybase/persisters/persister-indexed-db/with-schemas';
import { Persister } from 'tinybase/persisters/with-schemas';
import { CellSchema, createStore, Store } from 'tinybase/store/with-schemas';
import {
  DEFAULT_NOTEBOOK_ID,
  DEFAULT_SPACE_ID,
  ROOT_FOLDER
} from '../constants';
import { DocumentNode } from '../documents/document';

type documentKeyEnum = keyof Required<Omit<DocumentNode, 'id'>>;
export type SpaceType = [
  {
    documents: {
      [cellId in documentKeyEnum]: CellSchema;
    };
  },
  {} // could include overrides for theme, currentXXX on user demand
];

export type StoreType = [
  {
    // settings per space that won't be persisted outside of the current client
    spaceSettings: {
      currentNotebook: CellSchema;
      currentFolder: CellSchema;
    };
  },
  {
    theme: { type: 'string'; default: 'dark' };
    currentSpace: { type: 'string'; default: typeof DEFAULT_SPACE_ID };
  }
];

class StorageService {
  private store!: Store<StoreType>;
  private spaces!: Map<string, Store<SpaceType>>;
  private persister!: Persister<StoreType>;
  private ok = false;

  public constructor() {
    this.spaces = new Map();

    this.spaces.set(
      DEFAULT_SPACE_ID,
      createStore().setTablesSchema({
        documents: {
          title: { type: 'string' } as CellSchema,
          parent: { type: 'string' } as CellSchema,
          type: { type: 'string' } as CellSchema,
          content: { type: 'string' } as CellSchema,
          created: { type: 'number' } as CellSchema,
          updated: { type: 'number' } as CellSchema,
          deleted: { type: 'boolean', default: false } as CellSchema
        }
      })
    );

    this.store = createStore()
      .setTablesSchema({
        spaceSettings: {
          currentNotebook: {
            type: 'string',
            default: DEFAULT_NOTEBOOK_ID
          } as CellSchema,
          currentFolder: { type: 'string', default: ROOT_FOLDER } as CellSchema
        }
      })
      .setValuesSchema({
        theme: { type: 'string', default: 'dark' },
        currentSpace: { type: 'string', default: DEFAULT_SPACE_ID }
      });

    this.persister = createIndexedDbPersister(this.store, 'kiwimeriAppStore');
  }

  public async start() {
    if (!this.ok) {
      this.ok = true;
      await this.persister.load();
      await this.persister.startAutoSave();
    }
    // TODO load existing spaces from store
    // and create persisters for them
    // but not yet, i wanna test what happens on empty collection
    // also test what happens on empty store
  }

  public getCurrentSpace() {
    return DEFAULT_SPACE_ID;
  }

  public getSpace(space?: string) {
    return this.spaces.get(space ? space : this.getCurrentSpace())!;
  }

  public getStore() {
    return this.store;
  }
}

const storageService = new StorageService();
export default storageService;
