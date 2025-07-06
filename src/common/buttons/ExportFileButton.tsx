import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import formatterService from '@/format-conversion/formatter.service';
import { IonButton, IonIcon, IonToast } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import React, { useState } from 'react';
import { Id } from 'tinybase/with-schemas';
import filesystemService from '../services/filesystem.service';
import platformService from '../services/platform.service';
import { unminimizeContentFromStorage } from '../wysiwyg/compress-file-content';

type ExportFileButtonProps = {
  id: Id;
  onClose: (role?: string) => void;
};

const ExportFileButton = ({ id, onClose }: ExportFileButtonProps) => {
  const { t } = useLingui();
  const [isOpen, setIsOpen] = useState(false);
  const toast = React.useRef(null);

  function setToast(msg: string, color: string) {
    if (toast.current) {
      const current = toast.current as HTMLIonToastElement;
      current.message = msg;
      current.color = color;
      setIsOpen(true);
    }
  }

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
      .exportToFile(`${fileTitle}.md`, content, 'simple/text')
      .then(() => {
        if (platformService.isAndroid()) {
          setToast(t`Success!`, 'success');
          // TODO handle this more gracefully
          setTimeout(() => onClose(), 3000); // let toast enough time
        } else {
          onClose();
        }
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
      <IonToast
        ref={toast}
        isOpen={isOpen}
        onDidDismiss={() => setIsOpen(false)}
        duration={3000}
        swipeGesture="vertical"
        buttons={[
          {
            text: 'Dismiss',
            role: 'cancel'
          }
        ]}
      ></IonToast>
    </IonButton>
  );
};
export default ExportFileButton;
