/* eslint-disable @typescript-eslint/no-empty-object-type */
import {
  DEFAULT_NOTEBOOK_ID,
  DEFAULT_SPACE_ID,
  INTERNAL_FORMAT
} from '@/constants';
import { createIndexedDbPersister } from 'tinybase/persisters/persister-indexed-db/with-schemas';
import { Persister } from 'tinybase/persisters/with-schemas';
import { createQueries, Queries } from 'tinybase/queries/with-schemas';
import { CellSchema, createStore, Store } from 'tinybase/store/with-schemas';
import { createIndexes, Indexes } from 'tinybase/with-schemas';
import localChangesService from './local-changes.service';
import notebooksService from './notebooks.service';
import tagsService from './tags.service';
import { SpaceType } from './types/space-types';
import { StoreType } from './types/store-types';

export type StoreId = 'store' | 'space';

class StorageService {
  private store!: Store<StoreType>;
  private storeLocalPersister!: Persister<StoreType>;
  private storeQueries!: Queries<StoreType>;
  private storeIndexes!: Indexes<StoreType>;

  private spaces: Map<string, Store<SpaceType>> = new Map();
  private spaceQueries: Map<string, Queries<SpaceType>> = new Map();
  private spaceLocalPersisters: Map<string, Persister<SpaceType>> = new Map();

  public constructor() {
    this.reInitDB();
  }

  public reInitDB() {
    this.store = createStore()
      .setTablesSchema({
        spaces: {
          currentNotebook: {
            type: 'string',
            default: DEFAULT_NOTEBOOK_ID
          } as CellSchema,
          currentFolder: {
            type: 'string',
            default: DEFAULT_NOTEBOOK_ID
          } as CellSchema,
          currentDocument: { type: 'string' } as CellSchema,
          currentPage: { type: 'string' } as CellSchema,
          lastLocalChange: { type: 'number' } as CellSchema,
          lastPulled: { type: 'number' } as CellSchema
        },
        localChanges: {
          space: { type: 'string' } as CellSchema,
          item: { type: 'string' } as CellSchema,
          change: { type: 'string' } as CellSchema,
          field: { type: 'string' } as CellSchema,
          updated: { type: 'number' } as CellSchema
        },
        remotes: {
          state: { type: 'string' } as CellSchema,
          name: { type: 'string' } as CellSchema,
          space: { type: 'string' } as CellSchema,
          rank: { type: 'number' } as CellSchema,
          type: { type: 'string' } as CellSchema,
          config: { type: 'string' } as CellSchema,
          formats: { type: 'string', default: INTERNAL_FORMAT } as CellSchema
        },
        remoteState: {
          connected: { type: 'boolean' } as CellSchema,
          lastRemoteChange: { type: 'number' } as CellSchema,
          info: { type: 'string' } as CellSchema
        },
        remoteItems: {
          state: { type: 'string' } as CellSchema,
          item: { type: 'string' } as CellSchema,
          info: { type: 'string' } as CellSchema
        },
        logs: {
          ts: { type: 'number' } as CellSchema,
          level: { type: 'string' } as CellSchema,
          message: { type: 'string' } as CellSchema
        }
      })
      .setValuesSchema({
        theme: { type: 'string', default: 'dark' },
        showDevTools: { type: 'boolean', default: false },
        maxLogHistory: { type: 'number', default: 500 },
        internalProxy: { type: 'string' },
        currentSpace: { type: 'string', default: DEFAULT_SPACE_ID },
        exportIncludeMetadata: { type: 'boolean', default: true },
        exportInlinePages: { type: 'boolean', default: true }
      });

    this.storeQueries = createQueries(this.store);
    this.storeIndexes = createIndexes(this.store);

    // later: do that dynamically
    this.spaces.set(DEFAULT_SPACE_ID, this.createSpace());

    this.spaceQueries.set(
      DEFAULT_SPACE_ID,
      createQueries(this.getSpace(DEFAULT_SPACE_ID))
    );
  }

  public async start(autoSave = true) {
    // only start persister for the current space
    // later: when switching space, only re init space persister
    this.storeLocalPersister = createIndexedDbPersister(
      this.store,
      'kiwimeri-store'
    );
    this.spaceLocalPersisters.set(
      DEFAULT_SPACE_ID,
      createIndexedDbPersister(
        this.getSpace(DEFAULT_SPACE_ID),
        `kiwimeri-space-${DEFAULT_SPACE_ID}`
      )
    );

    await Promise.all([
      this.startPersister(this.storeLocalPersister, autoSave),
      this.startPersister(
        this.spaceLocalPersisters.get(this.getSpaceId())!,
        autoSave
      )
    ]);
    // init spaces
    setTimeout(() => {
      notebooksService.initNotebooks();
    });
  }

  public async stop() {
    await this.storeLocalPersister.destroy();
    await this.spaceLocalPersisters.get(this.getSpaceId())!.destroy();
  }

  private createSpace() {
    return createStore().setTablesSchema({
      collection: {
        title: { type: 'string' } as CellSchema,
        title_meta: { type: 'string' } as CellSchema,
        parent: { type: 'string' } as CellSchema,
        parent_meta: { type: 'string' } as CellSchema,
        type: { type: 'string' } as CellSchema,
        content: { type: 'string' } as CellSchema,
        content_meta: { type: 'string' } as CellSchema,
        preview: { type: 'string' } as CellSchema,
        tags: { type: 'string' } as CellSchema,
        tags_meta: { type: 'string' } as CellSchema,
        created: { type: 'number' } as CellSchema,
        updated: { type: 'number' } as CellSchema,
        deleted: { type: 'boolean', default: false } as CellSchema,
        deleted_meta: { type: 'string' } as CellSchema,
        conflict: { type: 'string' } as CellSchema,
        order: { type: 'number' } as CellSchema,
        order_meta: { type: 'string' } as CellSchema,
        display_opts: { type: 'string' } as CellSchema,
        display_opts_meta: { type: 'string' } as CellSchema
      }
    });
  }

  private async startPersister(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    storePersister: Persister<any>,
    autoSave: boolean
  ) {
    await storePersister.load();
    if (autoSave) {
      await storePersister.startAutoSave();
    }
  }

  public getSpaceId() {
    // later: the current selected space
    return DEFAULT_SPACE_ID;
  }

  public getSpace(space?: string) {
    return this.spaces.get(space ? space : this.getSpaceId())!;
  }

  public getSpaceQueries(space?: string) {
    return this.spaceQueries.get(space ? space : storageService.getSpaceId())!;
  }

  public getStore() {
    return this.store;
  }

  public getStoreQueries() {
    return this.storeQueries;
  }

  public getStoreIndexes() {
    return this.storeIndexes;
  }

  public get(storeId: StoreId) {
    if (storeId === 'space') {
      return this.getSpace();
    }
    return this.store;
  }

  public getQueries(storeId: StoreId) {
    if (storeId === 'space') {
      return this.getSpaceQueries();
    }
    return this.storeQueries;
  }

  public getIndexes(storeId: StoreId) {
    if (storeId === 'space') {
      throw new Error('unimplemented');
    }
    return this.storeIndexes;
  }

  public nukeSpace() {
    this.getSpace().setContent([{}, {}]);
    notebooksService.initNotebooks();
    localChangesService.clear();
    tagsService.clear();
  }
}

const storageService = new StorageService();
export default storageService;
