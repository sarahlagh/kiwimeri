export interface KMCloudClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  configure: (conf: any) => void;
  init: () => void;
  push: () => void;
  pull: () => void;
}
