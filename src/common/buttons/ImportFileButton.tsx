import { CollectionItemResult } from '@/collection/collection';
import { ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
import storageService from '@/db/storage.service';
import formatterService from '@/format-conversion/formatter.service';
import { OverlayEventDetail } from '@ionic/core/components';
import { useIonModal } from '@ionic/react';
import { SerializedEditorState, SerializedLexicalNode } from 'lexical';
import { useState } from 'react';
import ConfirmImportModal from '../modals/ConfirmImportModal';
import GenericImportFileButton from './GenericImportFileButton';

type ImportFileButtonProps = {
  parent: string | null;
};

const ImportFileButton = ({ parent }: ImportFileButtonProps) => {
  const [items, setItems] = useState<CollectionItemResult[]>([]);
  const [present, dismiss] = useIonModal(ConfirmImportModal, {
    folder: parent || ROOT_FOLDER,
    items,
    onClose: (confirm: boolean, item?: CollectionItemResult) => {
      dismiss({ confirm, item });
    }
  });

  const onContentReadConfirm = (
    lexical: SerializedEditorState<SerializedLexicalNode>,
    pages: string[],
    fileName: string,
    item?: CollectionItemResult
  ) => {
    storageService.getSpace().transaction(() => {
      // is there a document with same name?
      if (item) {
        console.debug(
          'overwriting document with the same file name',
          parent,
          item.id
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

      pages.forEach(page => {
        const pageId = collectionService.addPage(itemId);
        const lexical = formatterService.getLexicalFromMarkdown(page);
        collectionService.setItemLexicalContent(pageId, lexical);
      });
    });
  };

  const onContentRead = async (content: string, file: File) => {
    const fileName = file.name.replace(/\.(md|MD)$/, '');
    const pages = content.split(formatterService.getPagesSeparator());
    const doc = pages.shift()!;
    const lexical = formatterService.getLexicalFromMarkdown(doc);

    const items = collectionService
      .getBrowsableCollectionItems(parent || ROOT_FOLDER)
      .filter(item => item.title === fileName);

    if (items.length > 0) {
      setItems(items);
      return new Promise<boolean>(function (resolve) {
        present({
          cssClass: 'auto-height',
          onWillDismiss: (event: CustomEvent<OverlayEventDetail>) => {
            if (event.detail.data?.confirm === true) {
              onContentReadConfirm(
                lexical,
                pages,
                fileName,
                event.detail.data.item
              );
            }
            resolve(event.detail.data?.confirm === true);
          }
        });
      });
    } else {
      onContentReadConfirm(lexical, pages, fileName);
      return true;
    }
  };

  return (
    <GenericImportFileButton
      onContentRead={onContentRead}
    ></GenericImportFileButton>
  );
};
export default ImportFileButton;
