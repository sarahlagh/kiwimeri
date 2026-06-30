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
    /** only applicable on android: if the app should open a file picker - true by default */
    requestFilePicker?: boolean;
    /** only applicable on android if requestFilePicker == false: an optional parent directory under Documents where to write the file */
    appDir?: string;
    /** only applicable on android if requestFilePicker == false: whether existing files should be overwritten - false by default */
    overwrite?: boolean;
  }): Promise<{ success: boolean; streamId?: number }>;
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
}

const BetterFilesystem = registerPlugin<BetterFilesystemPlugin>(
  'BetterFilesystem',
  {
    web: () => new WebBetterFilesystem()
  }
);

export default BetterFilesystem;
