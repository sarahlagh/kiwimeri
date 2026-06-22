import { store } from '@/core/db/store';
import { useStoreValueWithDefault } from './tinybase/hooks';

class NavService {
  public setRememberLastRoute(value: boolean) {
    store.setValue('rememberLastRoute', value);
  }

  public useRememberLastRoute() {
    return useStoreValueWithDefault('rememberLastRoute', true);
  }
}

/** @deprecated */
const navService = new NavService();
export default navService;
