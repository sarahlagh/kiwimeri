import {
  CollectionItem,
  CollectionItemResult,
  CollectionItemType
} from '@/collection/collection';
import CollectionItemBreadcrumb from '@/collection/components/CollectionItemBreadcrumb';
import CollectionItemList from '@/collection/components/CollectionItemList';
import { dateToStr } from '@/common/date-utils';
import collectionService from '@/db/collection.service';
import navService from '@/db/nav.service';
import storageService from '@/db/storage.service';
import {
  IonButton,
  IonButtons,
  IonFooter,
  IonHeader,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { SerializedEditorState } from 'lexical';
import { useEffect, useState } from 'react';

export type SavePayload = {
  content: SerializedEditorState;
  newItem?: CollectionItem;
  existingItem?: CollectionItemResult;
};

type SaveSessionModalProps = {
  onClose: (payload?: SavePayload) => void;
};

const SaveSessionModal = ({ onClose }: SaveSessionModalProps) => {
  const { t } = useLingui();
  const [parent, setParent] = useState(navService.getCurrentFolder());
  const [tempItem, setTempItem] = useState<
    (CollectionItem & { id: string }) | null
  >(null);
  const [item, setItem] = useState<CollectionItemResult | null>(null);
  const content = storageService.getStore().getValue('tempDoc');
  const items = collectionService.useBrowsableCollectionItems(parent);

  useEffect(() => {
    if (tempItem === null) {
      const { item: previewItem, id } =
        collectionService.getNewDocumentObj(parent);
      previewItem.title = t`timed session ` + dateToStr('iso');
      setTempItem({ ...previewItem, id });
      if (item === null) {
        setItem({ ...previewItem, id });
      }
    }
  });

  const finalItems =
    item && item.id === tempItem?.id
      ? [{ ...item, title: item.title + t` (new)` }, ...items]
      : [...items];

  return (
    <>
      <IonHeader>
        <IonTitle>
          <Trans>Choose where to save your work</Trans>
        </IonTitle>
        <CollectionItemBreadcrumb
          minBreadcrumb={0}
          folder={parent}
          onClick={item => {
            setParent(item);
          }}
        />
      </IonHeader>
      <CollectionItemList
        items={finalItems}
        onSelectedItem={selected => {
          if (selected.type === CollectionItemType.folder) {
            setParent(selected.id);
          } else if (selected.id === item?.id) {
            // unselect document
            setItem(tempItem);
          } else {
            setItem(selected);
          }
        }}
        selected={item?.id}
      ></CollectionItemList>

      <IonFooter>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton
              onClick={() => {
                onClose();
              }}
            >
              <Trans>Close</Trans>
            </IonButton>
          </IonButtons>
          <IonButtons slot="end">
            <IonButton
              color={'primary'}
              disabled={item === null}
              onClick={() => {
                if (!item) return;
                const payload: SavePayload = {
                  content: JSON.parse(content!)
                };
                if (item.id === tempItem?.id) {
                  payload.newItem = tempItem;
                } else {
                  payload.existingItem = item;
                  // merge existing content with new
                  payload.content =
                    collectionService.appendUnsavedLexicalContent(
                      item.id,
                      payload.content
                    );
                }
                onClose(payload);
              }}
            >
              {item?.id === tempItem?.id ? (
                <Trans>Save</Trans>
              ) : (
                <Trans>Merge</Trans>
              )}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonFooter>
    </>
  );
};

export default SaveSessionModal;
