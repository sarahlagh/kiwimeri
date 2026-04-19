import { Store } from 'tinybase/with-schemas';
import { StoreType } from '../types/store-types';

export default function Migration(store: Store<StoreType>) {
  store.delTable('ancestors');
  store.delTable('search');
}
