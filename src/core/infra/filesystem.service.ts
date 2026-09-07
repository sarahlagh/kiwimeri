import { appConfig } from '@/config';
import BetterFilesystem from '@/core/infra/capacitor/better-filesystem.plugin';
import { plt } from '@/core/infra/platform';
import { strFromU8 } from 'fflate';

type OptionsBag = {
  requestFilePicker?: boolean;
  appDir?: string;
  overwrite?: boolean;
};

export class FilesystemService {
  async silentWriteFile(
    fileName: string,
    content: string | Uint8Array<ArrayBufferLike>,
    mimeType = 'application/json'
  ) {
    const optsBag: OptionsBag = {
      requestFilePicker: false,
      overwrite: true,
      appDir: appConfig.APP_DIR_NAME
    };
    if (plt.isAndroid()) {
      return this.streamDataToWrite(fileName, content, mimeType, optsBag);
    }

    return BetterFilesystem.exportToFile({
      fileName,
      mimeType,
      content,
      ...optsBag
    });
  }

  async exportToFile(
    fileName: string,
    content: string | Uint8Array<ArrayBufferLike>,
    mimeType = 'application/json'
  ) {
    if (plt.isAndroid()) {
      return this.streamDataToWrite(fileName, content, mimeType);
    }

    return BetterFilesystem.exportToFile({
      fileName,
      mimeType,
      content
    });
  }

  private async streamDataToWrite(
    fileName: string,
    content: string | Uint8Array<ArrayBufferLike>,
    mimeType = 'application/json',
    optsBag?: OptionsBag
  ) {
    if (typeof content === 'string') {
      return this.sendDataInChunk(
        fileName,
        content,
        mimeType,
        false,
        chunk => chunk as string,
        optsBag
      );
    }

    // TODO empty zips are read as invalid?
    return this.sendDataInChunk(
      fileName,
      content,
      mimeType,
      true,
      chunk => btoa(strFromU8(chunk as Uint8Array<ArrayBufferLike>, true)),
      optsBag
    );
  }

  private async sendDataInChunk(
    fileName: string,
    content: string | Uint8Array<ArrayBufferLike>,
    mimeType: string,
    isBase64: boolean,
    getChunkAsString: (chunk: string | Uint8Array<ArrayBuffer>) => string,
    optsBag?: OptionsBag
  ) {
    let pos = 0;
    let streamId: number | undefined = undefined;
    do {
      // make first chunk smaller on purpose
      // if callback needed (file picker or permission request), capacitor might save plugin call
      // triggering TransactionTooLargeException
      const end =
        pos === 0
          ? Math.min(30000, content.length)
          : Math.min(pos + 150000, content.length);
      const chunk = getChunkAsString(content.slice(pos, end));
      const eof = end >= content.length;

      const resp = await BetterFilesystem.exportToFile({
        fileName,
        mimeType,
        content: chunk,
        isBase64,
        streamId,
        eof,
        ...optsBag
      });
      pos = end;
      if (!resp.success) {
        return { success: false };
      }
      streamId = resp.streamId;
    } while (pos < content.length);
    return { success: true };
  }

  async readFile(
    fileName: string,
    asBase64 = false,
    appDir = appConfig.APP_DIR_NAME
  ) {
    // only stream on android
    if (plt.isAndroid()) {
      const rawContent = await this.readDataInChunk(fileName, asBase64, appDir);
      if (!rawContent) return null;
      if (asBase64) return atob(rawContent); // TODO to u8
      return rawContent;
    }

    const resp = await BetterFilesystem.readFile({
      fileName,
      appDir,
      asBase64
    });
    return resp.content;
  }

  private async readDataInChunk(
    fileName: string,
    asBase64: boolean,
    appDir: string
  ) {
    let content = '';
    let eof = false;
    let streamId: number | undefined = undefined;
    do {
      const resp = await BetterFilesystem.readFile({
        fileName,
        appDir,
        asBase64,
        streamId
      });
      if (!resp.content) {
        return null;
      }
      content += resp.content;
      streamId = resp.streamId;
      eof = resp.eof;
    } while (!eof);
    return content;
  }

  async readFileBlob(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener(
        'load',
        () => {
          if (reader.result === null) {
            reject();
          } else {
            resolve(reader.result as ArrayBuffer);
          }
        },
        false
      );
      reader.readAsArrayBuffer(file);
    });
  }

  async renameFile(
    fileName: string,
    newFileName: string,
    appDir = appConfig.APP_DIR_NAME
  ) {
    return await BetterFilesystem.renameFile({
      fileName,
      newFileName,
      appDir
    });
  }
}

const filesystemService = new FilesystemService();
export default filesystemService;
