import { AnyData } from '@/db/types/store-types';
import { DriverFileInfo } from '../sync-types';

export abstract class CloudStorageDriver {
  public constructor(public driverName: string) {}

  public async connect(names: string[]) {
    const { connected, filesInfo } = await this.fetchFilesInfo(names);

    console.log(`${this.driverName} client initialized`, {
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

  public abstract fetchFilesInfo(names: string[]): Promise<{
    connected: boolean;
    filesInfo: DriverFileInfo[];
  }>;

  public abstract pushFile(
    filename: string,
    content: string
  ): Promise<DriverFileInfo>;

  public abstract pullFile(
    providerid: string,
    filename: string
  ): Promise<{ content?: string }>;

  public abstract deleteFile(
    providerid: string,
    filename: string
  ): Promise<void>;

  public abstract close(): Promise<void>;
}
