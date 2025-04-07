/* eslint-disable @typescript-eslint/no-explicit-any */
export interface KMStorageProvider {
  configure: (conf: any) => void; // accept user input and save in local store
  init: (spaceId: string) => Promise<{ test: boolean; config: any }>;
  push: (content: string) => Promise<void>; // push space to provider
  pull: () => Promise<string>; // pull space from provider
}
