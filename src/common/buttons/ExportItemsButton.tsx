/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CollectionItemType,
  CollectionItemTypeValues
} from '@/collection/collection';
import { ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import formatterService from '@/format-conversion/formatter.service';
import { IonicReactProps } from '@ionic/react/dist/types/components/IonicReactProps';
import { strToU8, zip } from 'fflate';
import { unminimizeContentFromStorage } from '../wysiwyg/compress-file-content';
import GenericExportFileButton from './GenericExportFileButton';

type ExportItemsButtonProps = {
  id?: string;
  type: CollectionItemTypeValues;
  onClose?: (role?: string) => void;
  label?: string;
  icon?: string | null;
} & IonicReactProps &
  React.HTMLAttributes<HTMLIonButtonElement> &
  React.HTMLAttributes<HTMLIonIconElement>;

const ExportItemsButton = ({
  id,
  type,
  label,
  icon,
  color,
  onClose
}: ExportItemsButtonProps) => {
  const fileMime =
    type !== CollectionItemType.folder ? 'text/markdown' : 'application/zip';

  function getDocumentContentFormatted(storedJson: string) {
    const content = storedJson.startsWith('{"root":{')
      ? storedJson
      : unminimizeContentFromStorage(storedJson);
    return formatterService.getMarkdownFromLexical(content);
  }

  function fillDirectoryStructure(
    id: string,
    fileTree: any,
    notebook?: string
  ) {
    const items = collectionService.getBrowsableCollectionItems(id, notebook);
    // create text files
    items
      .filter(item => item.type !== CollectionItemType.folder)
      .forEach((item, idx) => {
        let itemKey = `${item.title}.md`;
        if (fileTree[itemKey]) {
          itemKey = `${item.title} (${idx}).md`;
        }
        fileTree[itemKey] = [strToU8(getSingleDocumentContent(item.id))];
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
    if (id === 'space') {
      return 'collection.zip';
    }
    const fileTitle = collectionService.getItemTitle(id || ROOT_FOLDER);
    if (type === CollectionItemType.folder) {
      return `${fileTitle}.zip`;
    }
    return `${fileTitle}.md`;
  };

  const getSingleDocumentContent = (id: string, withPages = true) => {
    const json = collectionService.getItemContent(id) || '';
    let content: string;
    content = getDocumentContentFormatted(json);
    if (withPages) {
      const pages = collectionService.getDocumentPages(id);
      pages.forEach(page => {
        content += formatterService.getPagesSeparator();
        content += getDocumentContentFormatted(
          collectionService.getItemContent(page.id) || ''
        );
      });
    }
    return content;
  };

  const getFolderContent: (
    id: string
  ) => Promise<Uint8Array<ArrayBufferLike>> = async (id: string) => {
    const fileTree = fillDirectoryStructure(id, {});
    return getZipContent(fileTree);
  };

  const getSpaceContent: () => Promise<
    Uint8Array<ArrayBufferLike>
  > = async () => {
    const fileTree: any = {};
    const notebooks = notebooksService.getNotebooks();
    notebooks.forEach((notebook, idx) => {
      let key = notebook.title;
      if (fileTree[key]) {
        key = `${notebook.title} (${idx})`;
      }
      fileTree[key] = fillDirectoryStructure(ROOT_FOLDER, {}, notebook.id);
    });
    return getZipContent(fileTree);
  };

  const getZipContent: (
    fileTree: any
  ) => Promise<Uint8Array<ArrayBufferLike>> = async fileTree => {
    return new Promise((resolve, reject) => {
      zip(fileTree, { level: 0 }, (err, data) => {
        if (err) {
          console.error('error zipping data', err);
          return reject(err);
        }
        return resolve(data);
      });
    });
  };

  const getFileContent: () => Promise<
    string | Uint8Array<ArrayBufferLike>
  > = async () => {
    if (id === 'space') {
      return getSpaceContent();
    }
    if (!id) {
      return getFolderContent(ROOT_FOLDER);
    }
    if (type !== CollectionItemType.folder) {
      return getSingleDocumentContent(id);
    }
    return getFolderContent(id);
  };

  return (
    <GenericExportFileButton
      label={label}
      icon={icon}
      color={color}
      getFileTitle={getFileTitle}
      getFileContent={getFileContent}
      fileMime={fileMime}
      onDone={onClose}
    />
  );
};
export default ExportItemsButton;
