import { StoreType } from '@/core/db/store-schema';
import { Store } from 'tinybase/with-schemas';

export default function Migration(store: Store<StoreType>) {
  store.delTable('ancestors');
  store.delTable('search');
}
