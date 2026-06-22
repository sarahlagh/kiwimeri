import GenericImportFileButton, {
  ImportFileRejectReason,
  OnContentReadResponse
} from '@/common/buttons/GenericImportFileButton';
import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { useIonAlert } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';

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

  const onSingleJsonRead = async (content: string) => {
    // TODO validate schema
    const json = JSON.parse(content);
    const [tables] = json;
    space.setTable(SpaceTables.Collection, tables.collection);
    space.setTable(SpaceTables.Annotations, tables.document_annotation);
    if (tables.history) {
      space.setTable(SpaceTables.History, tables.history);
    }
    if (tables.history_content) {
      space.setTable(SpaceTables.HistoryContent, tables.history_content);
    }
    if (tables.stats) {
      space.setTable(SpaceTables.Stats, tables.stats);
    }
    return { confirm: true } as OnContentReadResponse;
  };

  const onZipFileRead = async (content: ArrayBuffer, file: File) => {
    const importService = (await import('../services/import.service')).default;
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
      return onSingleJsonRead(new TextDecoder().decode(content));
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
