import {
  CellSchema,
  createStore,
  NoValuesSchema,
  Store
} from 'tinybase/store/with-schemas';
import { Note } from '../../notes/note';

type NoteKeyEnum = keyof Required<Omit<Note, 'id'>>;

class StorageService {
  private store: Store<
    [
      {
        documents: {
          [cellId in NoteKeyEnum]: CellSchema;
        };
      },
      NoValuesSchema
    ]
  >;

  public constructor() {
    this.store = createStore().setTablesSchema({
      documents: {
        title: { type: 'string' } as CellSchema,
        content: { type: 'string' } as CellSchema
      }
    });

    this.store
      // add 2 notes
      .setRow('documents', '1', {
        title: 'Title 1',
        content: 'Content 1'
      })
      .setRow('documents', '2', {
        title: 'Title 2',
        content: 'Content 2'
      });
  }

  public getStore() {
    return this.store;
  }
}

const storageService = new StorageService();
export default storageService;
