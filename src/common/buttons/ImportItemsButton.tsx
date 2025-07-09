import { CollectionItemResult } from '@/collection/collection';
import { ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
import storageService from '@/db/storage.service';
import formatterService from '@/format-conversion/formatter.service';
import { OverlayEventDetail } from '@ionic/core/components';
import { useIonModal } from '@ionic/react';
import { unzip } from 'fflate';
import { SerializedEditorState, SerializedLexicalNode } from 'lexical';
import { useState } from 'react';
import { useHistory } from 'react-router';
import ConfirmImportModal from '../modals/ConfirmImportModal';
import { GET_ITEM_ROUTE } from '../routes';
import GenericImportFileButton from './GenericImportFileButton';

type ImportItemsButtonProps = {
  parent: string | null;
};

const ImportItemsButton = ({ parent }: ImportItemsButtonProps) => {
  const history = useHistory();
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
    let itemId = item?.id;
    storageService.getSpace().transaction(() => {
      // is there a document with same name?
      if (itemId) {
        console.debug(
          'overwriting document with the same file name',
          parent,
          itemId
        );
        // delete exising pages
        const pages = collectionService.getDocumentPages(itemId);
        pages.forEach(page => {
          collectionService.deleteItem(page.id);
        });
      } else {
        itemId = collectionService.addDocument(parent || ROOT_FOLDER);
        collectionService.setItemTitle(itemId, fileName);
      }
      collectionService.setItemLexicalContent(itemId, lexical);

      pages.forEach(page => {
        const pageId = collectionService.addPage(itemId!);
        const lexical = formatterService.getLexicalFromMarkdown(page);
        collectionService.setItemLexicalContent(pageId, lexical);
      });
    });
    history.push(GET_ITEM_ROUTE(parent || ROOT_FOLDER, itemId));
  };

  const onSingleFileRead = async (content: string, file: File) => {
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

  const onZipFileRead = async (content: ArrayBuffer) => {
    console.debug('content', content);
    const zipData = new Uint8Array(content);
    // TODO parse zipData to items: CollectionItemResult[]

    return new Promise<boolean>((resolve, reject) => {
      unzip(zipData, {}, (err, unzipped) => {
        if (err) {
          console.error('error unzipping data', err);
          return reject(false);
        }
        console.debug('unzipped', unzipped);
        return resolve(true);
      });
    });
  };

  const onContentRead = async (content: ArrayBuffer, file: File) => {
    // TODO handle type and return error if not supported
    if (
      file.name.toLowerCase().endsWith('.md') ||
      file.name.toLowerCase().endsWith('.txt')
    ) {
      return onSingleFileRead(new TextDecoder().decode(content), file);
    }
    if (file.name.toLowerCase().endsWith('.zip')) {
      return onZipFileRead(content);
    }
    return false;
  };

  return (
    <GenericImportFileButton
      onContentRead={onContentRead}
    ></GenericImportFileButton>
  );
};
export default ImportItemsButton;
