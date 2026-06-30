/* eslint-disable @typescript-eslint/no-explicit-any */
import GenericExportFileButton from '@/common_to_migrate/buttons/GenericExportFileButton';
import { getGlobalTrans } from '@/constants';
import collectionService from '@/db_to_migrate/collection.service';
import {
  CollectionItemType,
  CollectionItemTypeValues
} from '@/domain/collection/collection';
import notebooksService from '@/domain/collection/notebooks.service';
import { deviceSettings } from '@/domain/device-settings/device-settings.service';
import { useIonAlert } from '@ionic/react';
import { IonicReactProps } from '@ionic/react/dist/types/components/IonicReactProps';
import { useLingui } from '@lingui/react/macro';
import { ZipExportOptions } from '../model/model-export';

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
      includeMetadata: deviceSettings.get('exportIncludeMetadata')
    };
    const exportService = (await import('../services/export.service')).default;
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
      includeMetadata: deviceSettings.get('exportIncludeMetadata')
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
                  deviceSettings.set('exportIncludeMetadata', opt.checked);
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
