export enum PCloudResult {
  ok = 0,
  loginRequired = 1000,
  loginFailed = 2000,
  invalidName = 2001,
  accessDenied = 2003,
  dirNotFound = 2005,
  overQuota = 2008,
  connectionBroken = 2041,
  tooManyLoginTries = 4000,
  internalError = 5000,
  internalUploadError = 5001
}

export type PCloudMetadata = {
  name: string;
  created: string;
  modified: string;
  path: string;
  isfolder: boolean;
  folderid: number;
  hash: number;
  id: string;
  fileid: number;
  size: number;
  parentfolderid: number;
  contenttype: string;
  contents?: PCloudMetadata[];
};

export type PCloudResponse = {
  result: PCloudResult;
  error?: string;
};

export type PCloudListResponse = {
  metadata?: PCloudMetadata;
} & PCloudResponse;

export type PCloudLinkResponse = {
  path: string;
  expires: string;
  hosts: string[];
  size: number;
  hash: number;
  dwltag: string;
} & PCloudResponse;

export type PCloudUploadResponse = {
  metadata: PCloudMetadata[];
  checksums: { sha1: string; sha256: string }[];
  fileids: number[];
} & PCloudResponse;
