import { useLingui } from '@lingui/react/macro';
import storageService from '../../../db/storage.service';
import ImportExportSettings from './ImportExportSettings';

const ImportExportCollectionSettings = () => {
  const { t } = useLingui();
  return (
    <ImportExportSettings
      title={t`Import & export your app settings`}
      subtitle={t`Manually backup or restore your app settings`}
      description={t`This is different
            than the import / export of the collection. Your collection consists
            of your files and folders, and can be configured to synchronize with
            a cloud provider. The app settings consist of anything configured in
            this page, including the settings for your cloud provider.`}
      androidFolder="Downloads"
      exportFileSuffix="app-settings"
      onRestoreContent={(content: string) => {
        const json = JSON.parse(content);
        storageService.getStore().setContent(json);
      }}
      getContentToExport={() => {
        const content = storageService.getStore().getContent();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [contentToExport, valuesToExport]: [any, any] = content;
        delete contentToExport['spaces'];
        delete valuesToExport['currentSpace'];
        return JSON.stringify([contentToExport, valuesToExport]);
      }}
    />
  );
};
export default ImportExportCollectionSettings;
