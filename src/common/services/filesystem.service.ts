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
      return this.sendStringInChunk(fileName, content, mimeType);
    }

    // TODO empty zips are read as invalid?
    console.debug('send data as base64');

    // TODO chunk binary, then b64encode
    const b64encoded = btoa(strFromU8(content, true));
    console.debug('fileName', fileName);
    console.debug('mimeType', mimeType);
    console.debug('b64encoded: ', b64encoded.substring(0, 15) + '...');
    return BetterFilesystem.exportToFile({
      fileName,
      mimeType,
      content: b64encoded,
      isBase64: true
    });
  }

  private async sendStringInChunk(
    fileName: string,
    content: string,
    mimeType = 'application/json'
  ) {
    console.debug('send data as string', content.length);
    let pos = 0;
    let streamId: number | undefined = undefined;
    do {
      const end = pos + Math.min(150000, content.length);
      const chunk = content.slice(pos, end);
      const eof = end >= content.length;
      console.debug('send chunk', pos, end, eof, streamId);

      const resp = await BetterFilesystem.exportToFile({
        fileName,
        mimeType,
        content: chunk,
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
