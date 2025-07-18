import { registerPlugin, WebPlugin } from '@capacitor/core';

export interface BetterFilesystemPlugin {
  exportToFile(data: {
    fileName: string;
    mimeType: string;
    content: string | Uint8Array<ArrayBufferLike>;
    appDir?: string;
    isBase64?: boolean;
    overwrite?: boolean;
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
    const blob = new Blob([data.content], { type: data.mimeType });
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
