import { APPICONS, ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
import formatterService from '@/format-conversion/formatter.service';
import { IonButton, IonIcon, IonToast } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import React, { useState } from 'react';
import filesystemService from '../services/filesystem.service';

type ImportFileButtonProps = {
  parent: string | null;
};

const ImportFileButton = ({ parent }: ImportFileButtonProps) => {
  const { t } = useLingui();
  const errorMessage = t`An error occurred loading the file`;
  const successMessage = t`Success!`;
  const [isOpen, setIsOpen] = useState(false);
  const importElement = React.useRef(null);
  const toast = React.useRef(null);

  function setToast(msg: string, color: string) {
    if (toast.current) {
      const current = toast.current as HTMLIonToastElement;
      current.message = msg;
      current.color = color;
      setIsOpen(true);
    }
  }

  function importFile() {
    if (importElement.current) {
      const current = importElement.current as HTMLInputElement;
      current.click();
    }
  }

  // read the selected file
  const onImportFileRead: React.ChangeEventHandler<
    HTMLInputElement
  > = event => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const fileName = file.name.replace(/\.(md|MD)$/, '');
      // is there a document with same name?
      const item = collectionService
        .getBrowsableCollectionItems(parent || ROOT_FOLDER)
        .find(item => item.title === fileName);
      if (item) {
        console.debug('found document with the same file name', parent, item);
      }

      filesystemService.readFile(file).then(async content => {
        try {
          const docAndPages = content.split(
            formatterService.getPagesSeparator()
          );
          const doc = docAndPages.shift()!;
          const lexical = formatterService.getLexicalFromMarkdown(doc);

          let itemId = item?.id;
          if (!itemId) {
            itemId = collectionService.addDocument(parent || ROOT_FOLDER);
            collectionService.setItemTitle(itemId, fileName);
          }
          collectionService.setItemLexicalContent(itemId, lexical);

          if (docAndPages.length > 0) {
            // won't be able to merge existing pages like this, TODO
            docAndPages.forEach(page => {
              const pageId = collectionService.addPage(itemId);
              const lexical = formatterService.getLexicalFromMarkdown(page);
              collectionService.setItemLexicalContent(pageId, lexical);
            });
          }
          setToast(successMessage, 'success');
          // TODO open created document
        } catch (e) {
          console.error(e);
          setToast(errorMessage, 'warning');
        }
      });
    }
  };

  return (
    <IonButton
      expand="block"
      onClick={() => {
        importFile();
      }}
    >
      <IonIcon icon={APPICONS.import}></IonIcon>
      <input
        ref={importElement}
        onChange={onImportFileRead}
        type="file"
        className="ion-hide"
      />
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
export default ImportFileButton;
