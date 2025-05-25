/* eslint-disable @typescript-eslint/no-empty-object-type */
import platformService from '@/common/services/platform.service';
import {
  DEFAULT_NOTEBOOK_ID,
  DEFAULT_SPACE_ID,
  INTERNAL_FORMAT,
  ROOT_FOLDER
} from '@/constants';
import { createIndexedDbPersister } from 'tinybase/persisters/persister-indexed-db/with-schemas';
import { Persister } from 'tinybase/persisters/with-schemas';
import { createQueries, Queries } from 'tinybase/queries/with-schemas';
import { CellSchema, createStore, Store } from 'tinybase/store/with-schemas';
import { createIndexes, Indexes } from 'tinybase/with-schemas';
import notebooksService from './notebooks.service';
import remotesService from './remotes.service';
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
  private started = false;

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
          currentFolder: { type: 'string', default: ROOT_FOLDER } as CellSchema,
          currentDocument: { type: 'string' } as CellSchema,
          lastLocalChange: { type: 'number' } as CellSchema
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
        }
      })
      .setValuesSchema({
        theme: { type: 'string', default: 'dark' },
        currentSpace: { type: 'string', default: DEFAULT_SPACE_ID }
      });

    this.storeLocalPersister = createIndexedDbPersister(
      this.store,
      'kiwimeri-store'
    );

    this.storeQueries = createQueries(this.store);
    this.storeIndexes = createIndexes(this.store);

    // later: do that dynamically
    this.spaces.set(DEFAULT_SPACE_ID, this.createSpace());

    this.spaceQueries.set(
      DEFAULT_SPACE_ID,
      createQueries(this.getSpace(DEFAULT_SPACE_ID))
    );
    this.spaceLocalPersisters.set(
      DEFAULT_SPACE_ID,
      createIndexedDbPersister(
        this.getSpace(DEFAULT_SPACE_ID),
        `kiwimeri-space-${DEFAULT_SPACE_ID}`
      )
    );
  }

  public async start(autoLoad = true) {
    if (!this.started) {
      this.started = true;
      // only start persister for the current space
      // later: when switching space, only re init space persister
      await Promise.all([
        this.startPersister(this.storeLocalPersister, autoLoad),
        this.startPersister(
          this.spaceLocalPersisters.get(this.getSpaceId())!,
          autoLoad
        )
      ]);
      tagsService.reBuildTags();
      // in a timeout, don't want to block app start for this
      if (platformService.isSyncEnabled()) {
        setTimeout(async () => {
          await remotesService.initSyncConnection(this.getSpaceId());
        });
      }
      // init spaces
      setTimeout(() => {
        notebooksService.initNotebooks();
      });
      return true;
    }
    return false;
  }

  public async stop() {
    this.started = false;
    this.storeLocalPersister.stopAutoLoad();
    this.spaceLocalPersisters.get(this.getSpaceId())!.stopAutoLoad();
  }

  private createSpace() {
    return createStore().setTablesSchema({
      collection: {
        title: { type: 'string' } as CellSchema,
        title_meta: { type: 'string' } as CellSchema,
        parent: { type: 'string' } as CellSchema,
        parent_meta: { type: 'string' } as CellSchema,
        notebook: { type: 'string' } as CellSchema,
        notebook_meta: { type: 'string' } as CellSchema,
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
        display_opts: { type: 'string' } as CellSchema,
        display_opts_meta: { type: 'string' } as CellSchema
      }
    });
  }

  private async startPersister(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    storePersister: Persister<any>,
    autoLoad: boolean
  ) {
    await storePersister.load();
    if (autoLoad) {
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
}

const storageService = new StorageService();
export default storageService;
