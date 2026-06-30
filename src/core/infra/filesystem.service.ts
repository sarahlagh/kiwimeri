import BetterFilesystem from '@/core/infra/capacitor/better-filesystem.plugin';
import { plt } from '@/core/infra/platform';
import { strFromU8 } from 'fflate';

class FilesystemService {
  async exportToFile(
    fileName: string,
    content: string | Uint8Array<ArrayBufferLike>,
    mimeType = 'application/json'
  ) {
    if (plt.isAndroid()) {
      return this.startStreaming(fileName, content, mimeType);
    }

    return BetterFilesystem.exportToFile({
      fileName,
      mimeType,
      content
    });
  }

  private async startStreaming(
    fileName: string,
    content: string | Uint8Array<ArrayBufferLike>,
    mimeType = 'application/json'
  ) {
    if (typeof content === 'string') {
      return this.sendDataInChunk(
        fileName,
        content,
        mimeType,
        false,
        chunk => chunk as string
      );
    }

    // TODO empty zips are read as invalid?
    return this.sendDataInChunk(fileName, content, mimeType, true, chunk =>
      btoa(strFromU8(chunk as Uint8Array<ArrayBufferLike>, true))
    );
  }

  private async sendDataInChunk(
    fileName: string,
    content: string | Uint8Array<ArrayBufferLike>,
    mimeType: string,
    isBase64: boolean,
    getChunkAsString: (chunk: string | Uint8Array<ArrayBuffer>) => string
  ) {
    console.debug('send binary data as base64', mimeType, content.length);
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
      console.debug('send chunk', 'pos', pos, end - pos, eof, streamId);

      const resp = await BetterFilesystem.exportToFile({
        fileName,
        mimeType,
        content: chunk,
        isBase64,
        streamId,
        eof
      });
      pos = end;
      console.debug('success', resp.success);
      if (!resp.success) {
        return { success: false };
      }
      streamId = resp.streamId;
    } while (pos < content.length);
    return { success: true };
  }

  async readFile(file: File): Promise<ArrayBuffer> {
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
}

const filesystemService = new FilesystemService();
export default filesystemService;
