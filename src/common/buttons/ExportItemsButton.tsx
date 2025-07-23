/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CollectionItemType,
  CollectionItemTypeValues
} from '@/collection/collection';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import { IonicReactProps } from '@ionic/react/dist/types/components/IonicReactProps';
import { exportService } from '../services/export.service';
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
  const fileMime =
    type !== CollectionItemType.folder ? 'text/markdown' : 'application/zip';

  const getFileTitle = () => {
    if (type === CollectionItemType.page) {
      return 'page.md';
    }
    if (id === 'space') {
      return 'collection.zip';
    }
    if (!id || id === notebook) {
      return `${collectionService.getItemTitle(notebook)}.zip`;
    }
    const fileTitle = collectionService.getItemTitle(id);
    if (type === CollectionItemType.folder) {
      return `${fileTitle}.zip`;
    }
    // TODO if not inline pages and doc has page, is a zip
    return `${fileTitle}.md`;
  };

  const getFileContent: () => Promise<
    string | Uint8Array<ArrayBufferLike>
  > = async () => {
    if (id === 'space') {
      return exportService.toZip(exportService.getSpaceContent());
    }
    if (!id) {
      return exportService.toZip(exportService.getFolderContent(notebook));
    }
    if (type !== CollectionItemType.folder) {
      return exportService.getSingleDocumentContent(id);
    }
    return exportService.toZip(exportService.getFolderContent(id));
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
