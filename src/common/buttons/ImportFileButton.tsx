import { APPICONS, ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
import storageService from '@/db/storage.service';
import formatterService from '@/format-conversion/formatter.service';
import { IonButton, IonIcon } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import React from 'react';
import { useToastContext } from '../context/ToastContext';
import filesystemService from '../services/filesystem.service';

type ImportFileButtonProps = {
  parent: string | null;
};

const ImportFileButton = ({ parent }: ImportFileButtonProps) => {
  const { t } = useLingui();
  const { setToast } = useToastContext();
  const errorMessage = t`An error occurred loading the file`;
  const successMessage = t`Success!`;
  const importElement = React.useRef(null);

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

      filesystemService.readFile(file).then(async content => {
        try {
          const pages = content.split(formatterService.getPagesSeparator());
          const doc = pages.shift()!;
          const lexical = formatterService.getLexicalFromMarkdown(doc);

          storageService.getSpace().transaction(() => {
            // is there a document with same name?
            const item = collectionService
              .getBrowsableCollectionItems(parent || ROOT_FOLDER)
              .find(item => item.title === fileName);
            if (item) {
              // TODO warn user and ask for confirm (ask to delete existing pages too)
              console.debug(
                'found document with the same file name',
                parent,
                item
              );
              // delete exising pages
              const pages = collectionService.getDocumentPages(item.id);
              pages.forEach(page => {
                collectionService.deleteItem(page.id);
              });
            }
            let itemId = item?.id;
            if (!itemId) {
              itemId = collectionService.addDocument(parent || ROOT_FOLDER);
              collectionService.setItemTitle(itemId, fileName);
            }
            collectionService.setItemLexicalContent(itemId, lexical);

            // won't be able to merge existing pages like this, TODO
            pages.forEach(page => {
              const pageId = collectionService.addPage(itemId);
              const lexical = formatterService.getLexicalFromMarkdown(page);
              collectionService.setItemLexicalContent(pageId, lexical);
            });
          });

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
    </IonButton>
  );
};
export default ImportFileButton;
