import {
  CollectionItemResult,
  CollectionItemType
} from '@/collection/collection';
import { ROOT_FOLDER } from '@/constants';
import notebooksService from '@/db/notebooks.service';
import { OverlayEventDetail } from '@ionic/core/components';
import { useIonModal } from '@ionic/react';
import { SerializedEditorState, SerializedLexicalNode } from 'lexical';
import { useState } from 'react';
import { useHistory } from 'react-router';
import ConfirmFileImportModal from '../modals/ConfirmFileImportModal';
import ConfirmMultipleImportModal, {
  ConfirmMultipleImportModalParams
} from '../modals/ConfirmMultipleImportModal';
import { GET_ITEM_ROUTE } from '../routes';
import {
  importService,
  ZipMergeResult,
  ZipStructureOptions
} from '../services/import.service';
import GenericImportFileButton from './GenericImportFileButton';

type ImportItemsButtonProps = {
  parent: string;
} & ZipStructureOptions;

const ImportItemsButton = ({
  parent,
  createNotebook = false
}: ImportItemsButtonProps) => {
  const history = useHistory();
  const [singleDuplicates, setSingleDuplicates] = useState<
    CollectionItemResult[]
  >([]);
  const [params, setParams] = useState<
    Partial<ConfirmMultipleImportModalParams> | undefined
  >(undefined);

  const [presentSingle, dismissSingle] = useIonModal(ConfirmFileImportModal, {
    folder: parent,
    duplicates: singleDuplicates,
    onClose: (confirm: boolean, item?: CollectionItemResult) => {
      dismissSingle({ confirm, item });
    }
  });

  const [presentMultiple, dismissMultiple] = useIonModal(
    ConfirmMultipleImportModal,
    {
      params,
      onClose: (confirm: boolean, zipMerge?: ZipMergeResult) => {
        dismissMultiple({ confirm, zipMerge });
      }
    }
  );
  const onContentReadConfirm = (
    lexical: SerializedEditorState<SerializedLexicalNode>,
    pages: SerializedEditorState<SerializedLexicalNode>[],
    fileName: string,
    item?: CollectionItemResult
  ) => {
    const itemId = item?.id;
    importService.commitDocument(lexical, pages, parent, fileName, itemId);

    history.push(GET_ITEM_ROUTE(parent, itemId));
  };

  const onSingleDocumentRead = async (content: string, file: File) => {
    const fileName = file.name.replace(/\.(md|MD)$/, '');
    const { doc, pages } = importService.getLexicalFromContent(content);

    const itemsInCollection = importService.findDuplicates(
      parent,
      notebooksService.getCurrentNotebook(),
      [
        {
          title: fileName,
          type: CollectionItemType.document
        }
      ]
    );

    if (itemsInCollection.length > 0) {
      setSingleDuplicates(itemsInCollection);
      return new Promise<boolean>(function (resolve) {
        presentSingle({
          cssClass: 'auto-height',
          onWillDismiss: (event: CustomEvent<OverlayEventDetail>) => {
            if (event.detail.data?.confirm === true) {
              onContentReadConfirm(
                doc,
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
      onContentReadConfirm(doc, pages, fileName);
      return true;
    }
  };

  const onZipFileRead = async (content: ArrayBuffer, file: File) => {
    const zipName = file.name.replace(/(.*)\.(zip|ZIP)$/g, '$1');
    console.debug('content', zipName, content);

    return importService.readZip(content).then(unzipped => {
      const { items } = importService.parseZipData(zipName, parent, unzipped, {
        createNotebook,
        inlinePages: true,
        removeDuplicateIdentifiers: true
      });
      console.debug('items to import', items);
      setParams({
        folder: createNotebook ? ROOT_FOLDER : parent,
        notebook: createNotebook ? '-1' : notebooksService.getCurrentNotebook(),
        items,
        zipName
      });

      return new Promise<boolean>(resolve => {
        presentMultiple({
          cssClass: 'auto-height',
          onWillDismiss: (event: CustomEvent<OverlayEventDetail>) => {
            console.debug('modal event', event.detail);
            if (
              event.detail.data?.confirm === true &&
              event.detail.data?.zipMerge
            ) {
              importService.commitMergeResult(event.detail.data?.zipMerge);
            }
            resolve(event.detail.data?.confirm === true);
          }
        });
      });
    });
  };

  const onContentRead = async (content: ArrayBuffer, file: File) => {
    // TODO handle type and return error if not supported
    if (
      file.name.toLowerCase().endsWith('.md') ||
      file.name.toLowerCase().endsWith('.txt')
    ) {
      return onSingleDocumentRead(new TextDecoder().decode(content), file);
    }
    if (file.name.toLowerCase().endsWith('.zip')) {
      return onZipFileRead(content, file);
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
