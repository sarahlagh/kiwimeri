import storageService from '@/db/storage.service';
import { SpaceType } from '@/db/types/space-types';
import { useIonAlert } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import { Content } from 'tinybase/with-schemas';
import { importService } from '../services/import.service';
import GenericImportFileButton, {
  ImportFileRejectReason,
  OnContentReadResponse
} from './GenericImportFileButton';

type RestoreCollectionButtonProps = {
  id?: string;
  askConfirm?: boolean;
};

const zipTypes = ['application/zip'];
const textTypes = ['application/json'];

const RestoreCollectionButton = ({
  askConfirm = true
}: RestoreCollectionButtonProps) => {
  const { t } = useLingui();

  const [alert] = useIonAlert();

  const onSingleJsonRead = async (content: string, file: File) => {
    console.debug('file', file);

    const json: Content<SpaceType, true> = JSON.parse(content);
    // TODO validate schema
    storageService.getSpace().setContent(json);

    return { confirm: true } as OnContentReadResponse;
  };

  const onZipFileRead = async (content: ArrayBuffer, file: File) => {
    console.debug('file', file);

    return importService.readZip(content).then(unzipped => {
      const zipData = importService.parseZipData(file.name, unzipped);
      if (!importService.canRestoreSpace(zipData)) {
        return { confirm: false, reason: ImportFileRejectReason.NotSupported };
      }
      const confirm = importService.restoreSpace(zipData);
      return { confirm } as OnContentReadResponse;
    });
  };

  const handleContent = async (content: ArrayBuffer, file: File) => {
    if (zipTypes.find(type => file.type === type)) {
      return onZipFileRead(content, file);
    } else if (textTypes.find(type => file.type === type)) {
      return onSingleJsonRead(new TextDecoder().decode(content), file);
    }
    return { confirm: false, reason: ImportFileRejectReason.NotSupported };
  };

  const onContentRead = async (content: ArrayBuffer, file: File) => {
    if (askConfirm) {
      return new Promise<OnContentReadResponse>(resolve => {
        alert({
          header: t`Restore Collection`,
          message: t`This will delete your existing data. Are you sure?`,
          buttons: [
            {
              text: t`Cancel`,
              role: 'cancel',
              handler: () => {
                resolve({ confirm: false });
              }
            },
            {
              text: t`Confirm`,
              role: 'destructive',
              handler: async () => {
                const resp = await handleContent(content, file);
                resolve(resp);
              }
            }
          ]
        });
      });
    }

    return handleContent(content, file);
  };

  return (
    <GenericImportFileButton
      fill="clear"
      color="danger"
      icon={null}
      label={t`Restore`}
      onContentRead={onContentRead}
    />
  );
};
export default RestoreCollectionButton;
