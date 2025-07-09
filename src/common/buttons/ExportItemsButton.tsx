import {
  CollectionItemType,
  CollectionItemTypeValues
} from '@/collection/collection';
import { ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
import formatterService from '@/format-conversion/formatter.service';
import { strToU8, zip } from 'fflate';
import { Id } from 'tinybase/with-schemas';
import { unminimizeContentFromStorage } from '../wysiwyg/compress-file-content';
import GenericExportFileButton from './GenericExportFileButton';

type ExportItemsButtonProps = {
  id?: Id;
  type: CollectionItemTypeValues;
  onClose?: (role?: string) => void;
};

const ExportItemsButton = ({ id, type, onClose }: ExportItemsButtonProps) => {
  const fileMime =
    type !== CollectionItemType.folder ? 'text/markdown' : 'application/zip';

  function getContentAsMd(storedJson: string) {
    const content = storedJson.startsWith('{"root":{')
      ? storedJson
      : unminimizeContentFromStorage(storedJson);
    return formatterService.getMarkdownFromLexical(content);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function fillDirectoryStructure(id: string, fileTree: any) {
    const items = collectionService.getBrowsableCollectionItems(id);
    // create text files
    items
      .filter(item => item.type !== CollectionItemType.folder)
      .forEach((item, idx) => {
        let itemKey = `${item.title}.md`;
        if (fileTree[itemKey]) {
          itemKey = `${item.title} (${idx}).md`;
        }
        fileTree[itemKey] = [strToU8(getSingleFileContent(item.id))];
      });

    // create dirs
    items
      .filter(item => item.type === CollectionItemType.folder)
      .forEach((item, idx) => {
        let itemKey = item.title;
        if (fileTree[itemKey]) {
          itemKey = `${item.title} (${idx})`;
        }
        fileTree[itemKey] = {};
        fillDirectoryStructure(item.id, fileTree[itemKey]);
      });
    return fileTree;
  }

  const getFileTitle = () => {
    if (type === CollectionItemType.page) {
      return 'page.md';
    }
    const fileTitle = collectionService.getItemTitle(id || ROOT_FOLDER);
    if (type === CollectionItemType.folder) {
      return `${fileTitle}.zip`;
    }
    return `${fileTitle}.md`;
  };

  const getSingleFileContent = (id: string) => {
    const pages = collectionService.getDocumentPages(id);
    const json = collectionService.getItemContent(id) || '';
    let content: string;
    content = getContentAsMd(json);
    pages.forEach(page => {
      content += formatterService.getPagesSeparator();
      content += getContentAsMd(
        collectionService.getItemContent(page.id) || ''
      );
    });
    return content;
  };

  const getFolderContent: (
    id: string
  ) => Promise<Uint8Array<ArrayBufferLike>> = async (id: string) => {
    const fileTree = fillDirectoryStructure(id, {});
    return new Promise((resolve, reject) => {
      zip(fileTree, { level: 0 }, (err, data) => {
        if (err) {
          console.error('error zipping data', err);
          return reject(err);
        }
        console.debug('data', data);
        return resolve(data);
      });
    });
  };

  const getFileContent: () => Promise<
    string | Uint8Array<ArrayBufferLike>
  > = async () => {
    if (!id) {
      return getFolderContent(ROOT_FOLDER);
    }
    if (type !== CollectionItemType.folder) {
      return getSingleFileContent(id);
    }
    return getFolderContent(id);
  };

  return (
    <GenericExportFileButton
      getFileTitle={getFileTitle}
      getFileContent={getFileContent}
      fileMime={fileMime}
      onDone={onClose}
    />
  );
};
export default ExportItemsButton;
