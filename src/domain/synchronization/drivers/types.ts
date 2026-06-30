export type DriverNames = 'pcloud';

export type DriverFileInfo = {
  providerid: string;
  filename: string;
  updated: number;
  hash?: string;
  size?: number;
};

export type FileReference = {
  filename: string;
  providerid?: string;
};
