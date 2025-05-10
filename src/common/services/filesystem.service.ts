import { ANDROID_FOLDER } from '@/constants';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import platformService from './platform.service';

interface FilesystemService {
  /* export to file, returns relative directory path */
  exportToFile(
    fileName: string,
    content: string,
    directoryPath?: string
  ): Promise<boolean>;

  readFile(file: File): Promise<string>;
}

async function readFile(file: File): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.addEventListener(
      'load',
      () => {
        const content = reader.result as string;
        resolve(content);
      },
      false
    );
    reader.readAsText(file);
  });
}

class AndroidFilesystemService implements FilesystemService {
  async exportToFile(fileName: string, content: string) {
    await Filesystem.writeFile({
      path: `${ANDROID_FOLDER}/${fileName}`,
      data: content,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true
    });
    return true;
    // if (directoryPath) {
    //   await Filesystem.writeFile({
    //     path: 'KiwimeriApp/' + fileName,
    //     data: content,
    //     directory: Directory.Documents,
    //     encoding: Encoding.UTF8,
    //     recursive: true
    //   });
    //   return directoryPath;
    // }
    // const pickResult = await FilePicker.pickDirectory();
    // const relativePath = await this.getRelativeDirectoryPath(
    //   pickResult,
    //   Directory.Documents
    // );
    // await this.exportToFile(fileName, content, relativePath);
    // return relativePath;
  }

  async readFile(file: File): Promise<string> {
    return readFile(file);
  }
}

class WebFilesystemService implements FilesystemService {
  async exportToFile(fileName: string, content: string) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    document.documentElement.appendChild(a);
    a.setAttribute('style', 'display: none');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    return true;
  }

  async readFile(file: File): Promise<string> {
    return readFile(file);
  }
}

class FilesystemServiceFactory {
  getFilesystemService() {
    switch (platformService.getPlatform()) {
      case 'android':
        return new AndroidFilesystemService();
      default:
        return new WebFilesystemService();
    }
  }
}

const filesystemService = new FilesystemServiceFactory().getFilesystemService();
export default filesystemService;
