/* eslint-disable @typescript-eslint/no-explicit-any */
export interface StorageProvider {
  configure: (conf: any, proxy?: string, useHttp?: boolean) => void; // accept user input and save in local store
  init: (
    spaceId: string
  ) => Promise<{ connected: boolean; config: any; lastRemoteChange: number }>;
  push: (content: string) => Promise<any>; // push space to provider
  pull: () => Promise<{ content?: any; lastRemoteChange?: number }>; // pull space from provider
}
