import { registerPlugin, WebPlugin } from '@capacitor/core';

export interface BetterFilesystemPlugin {
  exportToFile(data: {
    fileName: string;
    mimeType: string;
    content: string | Uint8Array<ArrayBufferLike>;
    /** only applicable on android: the identifier for streaming */
    streamId?: number;
    /** only applicable on android: if streaming, must be true if for the last chunk */
    eof?: boolean;
    /** only applicable on android: if content should be decoded as base64 - false by default */
    isBase64?: boolean;
    /** only applicable on android/electron: if the app should open a file picker - true by default */
    requestFilePicker?: boolean;
    /** only applicable on android/electron if requestFilePicker == false: an optional parent directory under Documents where to write the file */
    appDir?: string;
    /** only applicable on android/electron if requestFilePicker == false: whether existing files should be overwritten - false by default */
    overwrite?: boolean;
  }): Promise<{ success: boolean; streamId?: number }>;

  readFile(data: {
    fileName: string;
    appDir: string;
    /** only applicable on android: the identifier for streaming */
    streamId?: number;
    /** only applicable on android: should be true if file is binary; false if text */
    asBase64?: boolean;
  }): Promise<{
    content: string | null;
    eof: boolean;
    streamId?: number;
  }>;

  renameFile(data: {
    fileName: string;
    newFileName: string;
    /** only applicable on android: an optional parent directory under Documents where the file is located */
    appDir: string;
    // overwrite?: boolean;
  }): Promise<{
    success: boolean;
  }>;

  deleteFile(data: {
    fileName: string;
    /** only applicable on android: an optional parent directory under Documents where the file is located */
    appDir: string;
  }): Promise<{ success: boolean }>;
}

export class WebBetterFilesystem
  extends WebPlugin
  implements BetterFilesystemPlugin
{
  async exportToFile(data: {
    fileName: string;
    mimeType: string;
    content: string | Uint8Array<ArrayBufferLike>;
  }) {
    const blob = new Blob([data.content as BlobPart], { type: data.mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    document.documentElement.appendChild(a);
    a.setAttribute('style', 'display: none');
    a.href = url;
    a.download = data.fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    return { success: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  readFile(data: never): Promise<{
    content: string | null;
    eof: boolean;
    streamId?: number;
  }> {
    throw new Error('readFile not available for web');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  renameFile(data: never): Promise<{
    success: boolean;
  }> {
    throw new Error('renameFile not available for web');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  deleteFile(data: never): Promise<{
    success: boolean;
  }> {
    throw new Error('deleteFile not available for web');
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const electronAPI = (window as any).electronAPI;

export class ElectronBetterFilesystem
  extends WebBetterFilesystem
  implements BetterFilesystemPlugin
{
  async exportToFile(data: {
    fileName: string;
    mimeType: string;
    content: string | Uint8Array<ArrayBufferLike>;
    requestFilePicker?: boolean;
    appDir?: string;
    overwrite?: boolean;
  }) {
    if (data.requestFilePicker !== false) {
      return super.exportToFile(data);
    }
    // TODO: overwrite, appDir, binary as base64
    try {
      await electronAPI.writeFile(data.fileName, data.content);
      return { success: true };
    } catch (e) {
      console.error('error writing to file', e);
      return { success: false };
    }
  }

  async readFile(data: {
    fileName: string;
    appDir: string;
    streamId?: number;
  }): Promise<{
    content: string | null;
    eof: boolean;
    streamId?: number;
  }> {
    // TODO appDir, handle binary file
    try {
      const content = await electronAPI.readFile(data.fileName);
      return {
        content,
        eof: true
      };
    } catch (e) {
      console.error('error reading file', e);
      return { content: null, eof: true };
    }
  }

  async renameFile(data: {
    fileName: string;
    newFileName: string;
    appDir: string;
    // overwrite?: boolean;
  }): Promise<{
    success: boolean;
  }> {
    try {
      // TODO appDir, overwrite
      electronAPI.renameFile(data.fileName, data.newFileName);
      return { success: true };
    } catch (e) {
      console.error('error renaming file', e);
      return { success: false };
    }
  }

  async deleteFile(data: { fileName: string; appDir: string }): Promise<{
    success: boolean;
  }> {
    try {
      electronAPI.deleteFile(data.fileName, data.appDir);
      return { success: true };
    } catch (e) {
      console.error('error deleting file', e);
      return { success: false };
    }
  }
}

const BetterFilesystem = registerPlugin<BetterFilesystemPlugin>(
  'BetterFilesystem',
  {
    web: () => new WebBetterFilesystem(),
    electron: () => new ElectronBetterFilesystem()
  }
);

export default BetterFilesystem;
