import {
  CollectionItemResult,
  CollectionItemType
} from '@/collection/collection';
import { OverlayEventDetail } from '@ionic/core/components';
import { useIonModal } from '@ionic/react';
import { SerializedEditorState, SerializedLexicalNode } from 'lexical';
import { lazy, useState } from 'react';
import { useHistory } from 'react-router';

import GenericImportFileButton, {
  ImportFileRejectReason,
  OnContentReadResponse
} from '@/common/buttons/GenericImportFileButton';
import { GET_ITEM_ROUTE } from '@/common/routes';

import {
  MultipleImportModalParams,
  ZipImportOptions,
  ZipMergeResult
} from '../model/model-import';

type ImportItemsButtonProps = {
  parent: string;
} & Partial<ZipImportOptions>;

const zipTypes = ['application/zip'];
const textTypes = ['text/plain', 'text/markdown'];

const ConfirmFileImportModal = lazy(
  () => import('../modals/ConfirmFileImportModal')
);
const ConfirmMultipleImportModal = lazy(
  () => import('../modals/ConfirmMultipleImportModal')
);

const ImportItemsButton = ({
  parent,
  createNotebook = false
}: ImportItemsButtonProps) => {
  const history = useHistory();
  const [singleDuplicates, setSingleDuplicates] = useState<
    CollectionItemResult[]
  >([]);
  const [params, setParams] = useState<
    Partial<MultipleImportModalParams> | undefined
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
      parent,
      onClose: (confirm: boolean, zipMerge?: ZipMergeResult) => {
        dismissMultiple({ confirm, zipMerge });
      }
    }
  );

  const onSingleDocumentRead = async (content: string, file: File) => {
    // TODO don't hardcode the regex here
    const fileName = file.name.replace(/\.(md|MD)$/, '');
    const importService = (await import('../services/import.service')).default;
    const { doc } = importService.parseNonLexicalContent(content);

    const itemsInCollection = importService.findDuplicates(parent, [
      {
        title: fileName,
        type: CollectionItemType.document
      }
    ]);

    if (!doc) {
      return { confirm: false } as OnContentReadResponse;
    }
    const onContentReadConfirm = (
      lexical: SerializedEditorState<SerializedLexicalNode>,
      fileName: string,
      item?: CollectionItemResult
    ) => {
      const itemId = item?.id;
      importService.commitDocument(lexical, parent, fileName, itemId);

      history.push(GET_ITEM_ROUTE(parent, itemId));
    };
    if (itemsInCollection.length > 0) {
      setSingleDuplicates(itemsInCollection);
      return new Promise<OnContentReadResponse>(function (resolve) {
        presentSingle({
          cssClass: 'auto-height',
          onWillDismiss: (event: CustomEvent<OverlayEventDetail>) => {
            if (event.detail.data?.confirm === true) {
              onContentReadConfirm(doc, fileName, event.detail.data.item);
            }
            resolve({ confirm: event.detail.data?.confirm === true });
          }
        });
      });
    } else {
      onContentReadConfirm(doc, fileName);
      return { confirm: true } as OnContentReadResponse;
    }
  };

  const onZipFileRead = async (content: ArrayBuffer, file: File) => {
    const importService = (await import('../services/import.service')).default;
    return importService.readZip(content).then(unzipped => {
      const zipData = importService.parseZipData(file.name, unzipped);
      setParams({
        createNotebook,
        zipData
      });

      return new Promise<OnContentReadResponse>(resolve => {
        presentMultiple({
          cssClass: 'fixed-width-modal',
          onWillDismiss: (event: CustomEvent<OverlayEventDetail>) => {
            if (
              event.detail.data?.confirm === true &&
              event.detail.data?.zipMerge
            ) {
              importService.commitMergeResult(event.detail.data?.zipMerge);
            }
            resolve({ confirm: event.detail.data?.confirm === true });
          }
        });
      });
    });
  };

  const onContentRead = async (content: ArrayBuffer, file: File) => {
    // TODO handle more types of compression
    if (zipTypes.find(type => file.type === type)) {
      return onZipFileRead(content, file);
    } else if (textTypes.find(type => file.type === type)) {
      return onSingleDocumentRead(new TextDecoder().decode(content), file);
    }
    return { confirm: false, reason: ImportFileRejectReason.NotSupported };
  };

  return (
    <GenericImportFileButton
      onContentRead={onContentRead}
    ></GenericImportFileButton>
  );
};
export default ImportItemsButton;
