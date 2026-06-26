import { AnyData } from '@/db/types/store-types';
import { DriverFileInfo, FileReference } from './model';

type CommonResponse = {
  success: boolean;
};

export abstract class CloudStorageDriver {
  public constructor(public driverName: string) {}

  public async connect(fileRefs: FileReference[]) {
    const { success: connected, filesInfo } =
      await this.fetchFilesInfo(fileRefs);

    console.log(`[${this.driverName}] client initialized`, {
      ...this.getConfig(),
      password: '*******'
    });

    return {
      config: this.getConfig(),
      connected,
      filesInfo
    };
  }

  public abstract configure(
    conf: AnyData,
    proxy?: string,
    useHttp?: boolean
  ): void; // accept user input and save in local store

  public abstract getConfig(): AnyData | null;

  public abstract fetchFilesInfo(fileRefs: FileReference[]): Promise<
    CommonResponse & {
      filesInfo?: DriverFileInfo[];
    }
  >;

  public abstract fileExists(
    fileRef: FileReference
  ): Promise<CommonResponse & { exists?: boolean }>;

  public abstract getFileInfo(
    fileRef: FileReference
  ): Promise<CommonResponse & { fileInfo?: DriverFileInfo }>;

  public abstract pushFile(
    fileRef: FileReference,
    content: string
  ): Promise<CommonResponse & { driverInfo?: DriverFileInfo }>;

  public abstract pullFile(
    fileRef: FileReference
  ): Promise<CommonResponse & { content?: string }>;

  public abstract deleteFile(fileRef: FileReference): Promise<CommonResponse>;

  public abstract renameFile(
    fileRef: FileReference,
    newFilename: string
  ): Promise<CommonResponse & { driverInfo?: DriverFileInfo }>;

  public abstract close(): Promise<void>;
}
