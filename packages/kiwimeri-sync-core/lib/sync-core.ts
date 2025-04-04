export interface KMStorageProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  configure: (conf: any) => void; // accept user input and save in local store
  test: () => Promise<boolean>; // test connection to report to user
  push: () => void; // push space to provider
  pull: () => void; // pull space from provider
}
