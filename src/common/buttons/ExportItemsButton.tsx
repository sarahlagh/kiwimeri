/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CollectionItemType,
  CollectionItemTypeValues
} from '@/collection/collection';
import { getGlobalTrans } from '@/config';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import { IonicReactProps } from '@ionic/react/dist/types/components/IonicReactProps';
import { exportService, ZipExportOptions } from '../services/export.service';
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
  const notebook = notebooksService.getCurrentNotebook();
  const hasPages =
    id &&
    type === CollectionItemType.document &&
    collectionService.getDocumentPages(id).length > 0;

  const opts: ZipExportOptions = {
    includeMetadata: true,
    inlinePages: false
  };

  const getFileMime = () => {
    if (hasPages && !opts.inlinePages) {
      return 'application/zip';
    }
    return type !== CollectionItemType.folder
      ? 'text/markdown'
      : 'application/zip';
  };

  const getFileTitle = () => {
    if (type === CollectionItemType.page) {
      return `${getGlobalTrans().defaultExportPageFilename}.md`;
    }
    if (id === 'space') {
      return `${getGlobalTrans().defaultExportSpaceFilename}.md`;
    }
    if (!id || id === notebook) {
      return `${collectionService.getItemTitle(notebook)}.zip`;
    }
    const fileTitle = collectionService.getItemTitle(id);
    if (type === CollectionItemType.folder) {
      return `${fileTitle}.zip`;
    }
    // if not inline pages and doc has page, is a zip
    if (hasPages && !opts.inlinePages) {
      return `${fileTitle}.zip`;
    }
    return `${fileTitle}.md`;
  };

  const getFileContent: () => Promise<
    string | Uint8Array<ArrayBufferLike>
  > = async () => {
    if (id === 'space') {
      return exportService.toZip(exportService.getSpaceContent(opts));
    }
    if (!id) {
      return exportService.toZip(
        exportService.getFolderContent(notebook, opts)
      );
    }
    if (type !== CollectionItemType.folder) {
      const docResp = exportService.getSingleDocumentContent(id, opts);
      if (typeof docResp === 'string') {
        return docResp;
      }
      return exportService.toZip(docResp);
    }
    return exportService.toZip(exportService.getFolderContent(id, opts));
  };

  return (
    <GenericExportFileButton
      label={label}
      icon={icon}
      color={color}
      getFileTitle={getFileTitle}
      getFileContent={getFileContent}
      fileMime={getFileMime()}
      onDone={onClose}
    />
  );
};
export default ExportItemsButton;
