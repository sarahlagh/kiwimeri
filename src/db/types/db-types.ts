import { CollectionItem } from '@/collection/collection';
import { DEFAULT_SPACE_ID } from '@/constants';
import { CellSchema } from 'tinybase/with-schemas';
import { Remote, RemoteState, Space } from './store-types';

type collectionItemKeyEnum = keyof Required<Omit<CollectionItem, 'id'>>;
export type SpaceType = [
  {
    collection: {
      [cellId in collectionItemKeyEnum]: CellSchema;
    };
  },
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  {} // could include overrides for theme, currentXXX on user demand
];

type spacesEnum = keyof Required<Space>;
type remoteEnum = keyof Required<Omit<Remote, 'id'>>;
type remoteStateEnum = keyof Required<Omit<RemoteState, 'id'>>;
export type StoreType = [
  {
    // settings per space that won't be persisted outside of the current client
    spaces: {
      [cellId in spacesEnum]: CellSchema;
    };
    remotes: {
      [cellId in remoteEnum]: CellSchema;
    };
    remoteState: {
      [cellId in remoteStateEnum]: CellSchema;
    };
  },
  {
    theme: { type: 'string'; default: 'dark' };
    currentSpace: { type: 'string'; default: typeof DEFAULT_SPACE_ID };
  }
];
