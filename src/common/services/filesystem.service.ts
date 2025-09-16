import BetterFilesystem from '@/capacitor/better-filesystem.plugin';
import { strFromU8 } from 'fflate';
import platformService from './platform.service';

class FilesystemService {
  async exportToFile(
    fileName: string,
    content: string | Uint8Array<ArrayBufferLike>,
    mimeType = 'application/json'
  ) {
    if (!platformService.isAndroid()) {
      return BetterFilesystem.exportToFile({
        fileName,
        mimeType,
        content
      });
    }

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
    console.debug('send binary data as base64', content.length);
    let pos = 0;
    let streamId: number | undefined = undefined;
    do {
      const end = pos + Math.min(150000, content.length);
      const chunk = getChunkAsString(content.slice(pos, end));
      const eof = end >= content.length;
      console.debug('send chunk', pos, end, eof, streamId);

      const resp = await BetterFilesystem.exportToFile({
        fileName,
        mimeType,
        content: chunk,
        isBase64,
        streamId,
        eof
      });
      pos = end;
      console.debug('success', resp.success, pos < content.length);
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
