/* eslint-disable @typescript-eslint/no-explicit-any */
export interface KMStorageProvider {
  configure: (conf: any, proxy?: string) => void; // accept user input and save in local store
  init: (
    spaceId: string
  ) => Promise<{ test: boolean; config: any; lastRemoteChange: number }>;
  push: (content: string) => Promise<any>; // push space to provider
  pull: () => Promise<{ content?: any; lastRemoteChange?: number }>; // pull space from provider
}
