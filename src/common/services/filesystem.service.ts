import BetterFilesystem from '@/capacitor/better-filesystem.plugin';
import { ANDROID_FOLDER } from '@/constants';
import { strFromU8 } from 'fflate';
import platformService from './platform.service';

class FilesystemService {
  async exportToFile(
    fileName: string,
    content: string | Uint8Array<ArrayBufferLike>,
    mimeType = 'application/json'
  ) {
    const appDir = ANDROID_FOLDER;

    if (typeof content === 'string' || !platformService.isAndroid()) {
      return BetterFilesystem.exportToFile({
        fileName,
        appDir,
        mimeType,
        content
      });
    }

    // TODO send in chunks
    // TODO empty zips are read as invalid?
    console.debug('send data as base64');

    const b64encoded = btoa(strFromU8(content, true));
    console.debug('fileName', fileName);
    console.debug('mimeType', mimeType);
    console.debug('b64encoded: ', b64encoded);
    return BetterFilesystem.exportToFile({
      fileName,
      mimeType,
      appDir,
      content: b64encoded,
      isBase64: true
    });
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
