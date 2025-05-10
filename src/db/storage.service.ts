/* eslint-disable @typescript-eslint/no-empty-object-type */
import {
  DEFAULT_NOTEBOOK_ID,
  DEFAULT_SPACE_ID,
  INTERNAL_FORMAT,
  ROOT_FOLDER
} from '@/constants';
import { Indexes as UntypedIndexes } from 'tinybase';
import { createIndexedDbPersister } from 'tinybase/persisters/persister-indexed-db/with-schemas';
import { Persister } from 'tinybase/persisters/with-schemas';
import { Queries as UntypedQueries } from 'tinybase/queries';
import { createQueries, Queries } from 'tinybase/queries/with-schemas';
import { Store as UntypedStore } from 'tinybase/store';
import { CellSchema, createStore, Store } from 'tinybase/store/with-schemas';
import { useCell, useResultSortedRowIds, useValue } from 'tinybase/ui-react';
import { createIndexes, Id, Indexes } from 'tinybase/with-schemas';
import remotesService from './remotes.service';
import {
  SpaceType,
  StoreTableId,
  StoreType,
  StoreValueId,
  StoreValueType
} from './types/db-types';

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
      // in a timeout, don't want to block app start for this
      setTimeout(async () => {
        await remotesService.initSyncConnection(this.getSpaceId());
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
        parent: { type: 'string' } as CellSchema,
        type: { type: 'string' } as CellSchema,
        content: { type: 'string' } as CellSchema,
        created: { type: 'number' } as CellSchema,
        updated: { type: 'number' } as CellSchema,
        deleted: { type: 'boolean', default: false } as CellSchema,
        conflict: { type: 'string' } as CellSchema
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

  public getUntypedStore() {
    return this.store as unknown as UntypedStore;
  }

  public getStoreQueries() {
    return this.storeQueries;
  }

  public getUntypedStoreQueries() {
    return this.storeQueries as unknown as UntypedQueries;
  }

  public getStoreIndexes() {
    return this.storeIndexes;
  }

  public getUntypedStoreIndexes() {
    return this.storeIndexes as unknown as UntypedIndexes;
  }

  public useValue(valueId: StoreValueId) {
    return useValue(valueId, this.getUntypedStore());
  }

  public setValue(valueId: StoreValueId, value: StoreValueType) {
    this.getStore().setValue(valueId, value);
  }

  public useCell<T>(tableId: StoreTableId, rowId: Id, cellId: Id) {
    return useCell(
      tableId,
      rowId,
      cellId,
      this.getUntypedStore()
    )?.valueOf() as T;
  }

  public useResultSortedRowIds(
    queryId: Id,
    cellId?: Id,
    descending?: boolean,
    offset?: number,
    limit?: number
  ) {
    return useResultSortedRowIds(
      queryId,
      cellId,
      descending,
      offset,
      limit,
      this.getUntypedStoreQueries()
    );
  }

  public getResultSortedRowIds(
    queryId: Id,
    cellId?: Id,
    descending?: boolean,
    offset?: number,
    limit?: number
  ) {
    return this.getUntypedStoreQueries().getResultSortedRowIds(
      queryId,
      cellId,
      descending,
      offset,
      limit
    );
  }
}

const storageService = new StorageService();
export default storageService;
