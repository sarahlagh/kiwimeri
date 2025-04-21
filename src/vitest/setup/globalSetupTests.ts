import type { TestProject } from 'vitest/node';

let teardown = false;
export default async function setup({ provide }: TestProject) {
  // const tinybaseContext = createContext(storageService.getSpace());
  // provide('tinybaseContext', tinybaseContext);
  provide('ok', true);
  return async () => {
    if (teardown) {
      throw new Error('teardown called twice');
    }
    teardown = true;
  };
}

declare module 'vitest' {
  export interface ProvidedContext {
    // tinybaseContext: React.Context<Store<SpaceType>>;
    ok: boolean;
  }
}
