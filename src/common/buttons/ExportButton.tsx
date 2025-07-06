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

type ExportButtonProps = {
  id: Id;
  onClose: (role?: string) => void;
};

const ExportButton = ({ id, onClose }: ExportButtonProps) => {
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

  function exportFile() {
    const json = collectionService.getItemContent(id);
    let content;
    if (json) {
      content = json.startsWith('{"root":{')
        ? json
        : unminimizeContentFromStorage(json);
      const fileContent = formatterService.getMarkdownFromLexical(content);
      const fileTitle = collectionService.getItemTitle(id);
      filesystemService
        .exportToFile(`${fileTitle}.md`, fileContent, 'simple/text')
        .then(() => {
          if (platformService.isAndroid()) {
            setToast(t`Success!`, 'success');
          }
          onClose();
        });
    }
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
export default ExportButton;
