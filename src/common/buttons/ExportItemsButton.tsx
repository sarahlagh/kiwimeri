/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CollectionItemType,
  CollectionItemTypeValues
} from '@/collection/collection';
import { getGlobalTrans } from '@/constants';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import userSettingsService from '@/db/user-settings.service';
import { useIonAlert } from '@ionic/react';
import { IonicReactProps } from '@ionic/react/dist/types/components/IonicReactProps';
import { useLingui } from '@lingui/react/macro';
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
  const { t } = useLingui();
  const [alert] = useIonAlert();

  const notebook = notebooksService.getCurrentNotebook();

  const getFileMime =
    type !== CollectionItemType.folder ? 'text/markdown' : 'application/zip';

  const getFileTitle = () => {
    if (id === 'space') {
      return `${getGlobalTrans().defaultExportSpaceFilename}.zip`;
    }
    if (!id || id === notebook) {
      return `${collectionService.getItemTitle(notebook)}.zip`;
    }
    const fileTitle = collectionService.getItemTitle(id);
    if (type === CollectionItemType.folder) {
      return `${fileTitle}.zip`;
    }
    return `${fileTitle}.md`;
  };

  const getFileContent: () => Promise<
    string | Uint8Array<ArrayBufferLike>
  > = async () => {
    const opts: ZipExportOptions = {
      includeMetadata: userSettingsService.getExportIncludeMetadata()
    };
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

  const confirm: () => Promise<boolean> = () => {
    const opts: ZipExportOptions = {
      includeMetadata: userSettingsService.getExportIncludeMetadata()
    };
    return new Promise<boolean>(resolve => {
      if (type !== CollectionItemType.document) {
        alert({
          header: t`Export Options`,
          inputs: [
            {
              label: t`Include metadata in zip`,
              type: 'checkbox',
              checked: opts.includeMetadata,
              handler: opt => {
                if (opt.checked !== undefined) {
                  userSettingsService.setExportIncludeMetadata(opt.checked);
                }
              }
            }
          ],
          buttons: [
            {
              text: t`Cancel`,
              role: 'cancel',
              handler: () => {
                resolve(false);
              }
            },
            {
              text: t`Confirm`,
              role: 'destructive',
              handler: async () => {
                resolve(true);
              }
            }
          ]
        });
      } else {
        resolve(true);
      }
    });
  };

  return (
    <GenericExportFileButton
      label={label}
      icon={icon}
      color={color}
      confirm={confirm}
      getFileTitle={getFileTitle}
      getFileContent={getFileContent}
      getFileMime={getFileMime}
      onDone={onClose}
    />
  );
};
export default ExportItemsButton;
