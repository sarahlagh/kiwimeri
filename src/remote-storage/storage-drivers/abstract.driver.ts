import { AnyData } from '@/db/types/store-types';
import { DriverFileInfo } from '../sync-types';

type CommonResponse = {
  success: boolean;
};

export abstract class CloudStorageDriver {
  public constructor(public driverName: string) {}

  public async connect(names: string[]) {
    const { success: connected, filesInfo } = await this.fetchFilesInfo(names);

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

  public abstract fetchFilesInfo(names: string[]): Promise<
    CommonResponse & {
      filesInfo?: DriverFileInfo[];
    }
  >;

  public abstract fileExists(
    filename: string
  ): Promise<CommonResponse & { exists?: boolean }>;

  public abstract getFileInfo(
    filename: string
  ): Promise<CommonResponse & { fileInfo?: DriverFileInfo }>;

  public abstract pushFile(
    filename: string,
    content: string
  ): Promise<CommonResponse & { driverInfo?: DriverFileInfo }>;

  public abstract pullFile(
    providerid: string,
    filename: string
  ): Promise<CommonResponse & { content?: string }>;

  public abstract deleteFile(
    providerid: string,
    filename: string
  ): Promise<CommonResponse>;

  public abstract renameFile(
    providerid: string,
    filename: string,
    newFilename: string
  ): Promise<CommonResponse>;

  public abstract close(): Promise<void>;
}
