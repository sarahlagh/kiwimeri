import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import formatterService from '@/format-conversion/formatter.service';
import { IonButton, IonIcon } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import { Id } from 'tinybase/with-schemas';
import { useToastContext } from '../context/ToastContext';
import filesystemService from '../services/filesystem.service';
import platformService from '../services/platform.service';
import { unminimizeContentFromStorage } from '../wysiwyg/compress-file-content';

type ExportFileButtonProps = {
  id: Id;
  onClose: (role?: string) => void;
};

const ExportFileButton = ({ id, onClose }: ExportFileButtonProps) => {
  const { t } = useLingui();

  const { setToast } = useToastContext();

  function getContentAsMd(storedJson: string) {
    const content = storedJson.startsWith('{"root":{')
      ? storedJson
      : unminimizeContentFromStorage(storedJson);
    return formatterService.getMarkdownFromLexical(content);
  }

  function exportFile() {
    const fileTitle = collectionService.getItemTitle(id);
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
    filesystemService
      .exportToFile(`${fileTitle}.md`, content, 'text/markdown')
      .then(() => {
        if (platformService.isAndroid()) {
          setToast(t`Success!`, 'success');
        }
        onClose();
      });
  }

  return (
    <IonButton
      expand="block"
      onClick={() => {
        exportFile();
      }}
    >
      <IonIcon icon={APPICONS.export}></IonIcon>
    </IonButton>
  );
};
export default ExportFileButton;
