import { useLingui } from '@lingui/react/macro';
import platformService from '../../../common/services/platform.service';
import storageService from '../../../db/storage.service';
import ImportExportSettings from './ImportExportSettings';

const ImportExportCollectionSettings = () => {
  const { t } = useLingui();
  return (
    <ImportExportSettings
      title={t`Import & export your collection`}
      subtitle={t`Manually backup or restore your collection.`}
      androidFolder="Documents/KiwimeriApp"
      exportFileSuffix={`${platformService.getPlatform()}-backup`}
      onRestoreContent={(content: string) => {
        const json = JSON.parse(content);
        storageService.getSpace().setContent(json);
      }}
      getContentToExport={() => {
        const content = storageService.getSpace().getJson();
        return content;
      }}
    />
  );
};
export default ImportExportCollectionSettings;
