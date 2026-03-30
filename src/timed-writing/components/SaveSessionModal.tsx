import { CollectionItem, CollectionItemType } from '@/collection/collection';
import CollectionItemBreadcrumb from '@/collection/components/CollectionItemBreadcrumb';
import CollectionItemList from '@/collection/components/CollectionItemList';
import { dateToStr } from '@/common/utils';
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
import { useState } from 'react';

export type SavePayload = {
  item: CollectionItem;
};

type SaveSessionModalProps = {
  onClose: (payload?: SavePayload) => void;
};

const SaveSessionModal = ({ onClose }: SaveSessionModalProps) => {
  const { t } = useLingui();
  const [parent, setParent] = useState(navService.getCurrentFolder());
  const content = storageService.getStore().getValue('tempDoc');

  const items = collectionService.useBrowsableCollectionItems(parent);
  const { item: previewItem, id } = collectionService.getNewDocumentObj(parent);
  previewItem.title = t`timed session ` + dateToStr('iso');
  if (content)
    collectionService.setUnsavedItemLexicalContent(
      previewItem,
      JSON.parse(content)
    );

  const finalItems = [{ ...previewItem, id }, ...items];

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
        onSelectedItem={item => {
          if (item.type === CollectionItemType.folder) {
            setParent(item.id);
          }
        }}
        selected={id}
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
              onClick={() => {
                onClose({
                  item: previewItem
                });
              }}
            >
              <Trans>Save</Trans>
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonFooter>
    </>
  );
};

export default SaveSessionModal;
