/* eslint-disable @typescript-eslint/no-empty-object-type */
import {
  DEFAULT_NOTEBOOK_ID,
  DEFAULT_SPACE_ID,
  ROOT_FOLDER
} from '@/constants';
import { DocumentNode } from '@/documents/document';
import { createIndexedDbPersister } from 'tinybase/persisters/persister-indexed-db/with-schemas';
import { Persister } from 'tinybase/persisters/with-schemas';
import { createQueries, Queries } from 'tinybase/queries/with-schemas';
import { Store as UntypedStore } from 'tinybase/store';
import { CellSchema, createStore, Store } from 'tinybase/store/with-schemas';
import { useCell } from 'tinybase/ui-react';
import { Space, SyncConfiguration } from './db-types';
import { syncConfService } from './sync-configurations.service';

type documentKeyEnum = keyof Required<Omit<DocumentNode, 'id'>>;
type SpaceType = [
  {
    documents: {
      [cellId in documentKeyEnum]: CellSchema;
    };
  },
  {} // could include overrides for theme, currentXXX on user demand
];

type spacesEnum = keyof Required<Space>;
type syncConfigurationEnum = keyof Required<Omit<SyncConfiguration, 'id'>>;
type StoreType = [
  {
    // settings per space that won't be persisted outside of the current client
    spaces: {
      [cellId in spacesEnum]: CellSchema;
    };
    syncConfigurations: {
      [cellId in syncConfigurationEnum]: CellSchema;
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
        spaces: {
          currentNotebook: {
            type: 'string',
            default: DEFAULT_NOTEBOOK_ID
          } as CellSchema,
          currentFolder: { type: 'string', default: ROOT_FOLDER } as CellSchema,
          currentDocument: { type: 'string' } as CellSchema,
          lastLocalChange: { type: 'number' } as CellSchema
        },
        syncConfigurations: {
          test: { type: 'boolean' } as CellSchema,
          config: { type: 'string' } as CellSchema,
          lastRemoteChange: { type: 'number' } as CellSchema
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
      // only start persister for the current space
      // later: when switching space, only re init space persister
      await Promise.all([
        this.startPersister(this.storePersister),
        this.startPersister(this.spacePersisters.get(this.getCurrentSpace())!)
      ]);
      // in a timeout, don't want to block app start for this
      setTimeout(async () => {
        await syncConfService.initSyncConnection(this.getCurrentSpace());
      });
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

  public async push() {
    const content = this.getSpace().getJson();
    const lastModified = await syncConfService
      .getCurrentProvider()
      .push(content);

    this.getStore().transaction(() => {
      this.setLastLocalChange(lastModified);
      syncConfService.setCurrentLastRemoteChange(lastModified as number);
    });
  }

  public async pull() {
    const resp = await syncConfService.getCurrentProvider().pull();
    if (resp && resp.content) {
      this.getSpace().setContent(resp.content);
      this.getStore().transaction(() => {
        this.setLastLocalChange(resp.lastRemoteChange!);
        syncConfService.setCurrentLastRemoteChange(resp.lastRemoteChange!);
      });
    }
  }

  public useLastLocalChange() {
    return (
      (useCell(
        'spaces',
        this.getCurrentSpace(),
        'lastLocalChange',
        this.getStore() as unknown as UntypedStore
      )?.valueOf() as number) || 0
    );
  }

  public setLastLocalChange(now: number) {
    this.getStore().setCell(
      'spaces',
      this.getCurrentSpace(),
      'lastLocalChange',
      now
    );
  }
}

const storageService = new StorageService();
export default storageService;
