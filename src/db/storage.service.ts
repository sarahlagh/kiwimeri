/* eslint-disable @typescript-eslint/no-empty-object-type */
import { createIndexedDbPersister } from 'tinybase/persisters/persister-indexed-db/with-schemas';
import { Persister } from 'tinybase/persisters/with-schemas';
import { createQueries, Queries } from 'tinybase/queries/with-schemas';
import { CellSchema, createStore, Store } from 'tinybase/store/with-schemas';
import {
  DEFAULT_NOTEBOOK_ID,
  DEFAULT_SPACE_ID,
  ROOT_FOLDER
} from '../constants';
import { DocumentNode } from '../documents/document';

type documentKeyEnum = keyof Required<Omit<DocumentNode, 'id'>>;
type SpaceType = [
  {
    documents: {
      [cellId in documentKeyEnum]: CellSchema;
    };
  },
  {} // could include overrides for theme, currentXXX on user demand
];

type StoreType = [
  {
    // settings per space that won't be persisted outside of the current client
    spaceSettings: {
      currentNotebook: CellSchema;
      currentFolder: CellSchema;
      currentDocument: CellSchema;
    };
  },
  {
    theme: { type: 'string'; default: 'dark' };
    currentSpace: { type: 'string'; default: typeof DEFAULT_SPACE_ID };
  }
];

class StorageService {
  private store!: Store<StoreType>;
  private storePersister!: Persister<StoreType>;

  private spaces: Map<string, Store<SpaceType>> = new Map();
  private queries: Map<string, Queries<SpaceType>> = new Map();
  private spacePersisters: Map<string, Persister<SpaceType>> = new Map();
  private started = false;

  public constructor() {
    this.store = createStore()
      .setTablesSchema({
        spaceSettings: {
          currentNotebook: {
            type: 'string',
            default: DEFAULT_NOTEBOOK_ID
          } as CellSchema,
          currentFolder: { type: 'string', default: ROOT_FOLDER } as CellSchema,
          currentDocument: { type: 'string' } as CellSchema
        }
      })
      .setValuesSchema({
        theme: { type: 'string', default: 'dark' },
        currentSpace: { type: 'string', default: DEFAULT_SPACE_ID }
      });

    this.storePersister = createIndexedDbPersister(
      this.store,
      'kiwimeri-store'
    );

    // later: do that dynamically
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
    this.queries.set(
      DEFAULT_SPACE_ID,
      createQueries(this.getSpace(DEFAULT_SPACE_ID))
    );
    this.spacePersisters.set(
      DEFAULT_SPACE_ID,
      createIndexedDbPersister(
        this.getSpace(DEFAULT_SPACE_ID),
        `kiwimeri-space-${DEFAULT_SPACE_ID}`
      )
    );
  }

  public async start() {
    if (!this.started) {
      this.started = true;
      await this.startPersister(this.storePersister);
      // later: do that dynamically
      await this.startPersister(
        this.spacePersisters.get(this.getCurrentSpace())!
      );
      return true;
    }
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async startPersister(storePersister: Persister<any>) {
    await storePersister.load();
    await storePersister.startAutoSave();
  }

  public getCurrentSpace() {
    return DEFAULT_SPACE_ID;
  }

  public getSpace(space?: string) {
    return this.spaces.get(space ? space : this.getCurrentSpace())!;
  }

  public getQueries(space?: string) {
    return this.queries.get(space ? space : storageService.getCurrentSpace())!;
  }

  public getStore() {
    return this.store;
  }
}

const storageService = new StorageService();
export default storageService;
