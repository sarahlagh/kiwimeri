import { useQueryResults } from '@/core/db/queries-helper';
import { store } from '@/core/db/store';
import {
  CollectionItem,
  CollectionItemType
} from '@/domain/collection/collection';
import collectionService from '@/domain/collection/collection.service';
import { resumeService } from '@/domain/collection/resume-state.service';
import {
  BrowsableItemResult,
  CollectionItemBreadcrumb,
  CollectionItemList,
  useFetchBrowsableItemsQuery,
  useFetchBrowsableItemsQueryParamsState
} from '@/features/collection-browser';
import { dateToStr } from '@/shared/misc/date-utils';
import {
  IonButton,
  IonButtons,
  IonFooter,
  IonHeader,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import type { SerializedEditorState } from 'lexical';
import { useMemo, useState } from 'react';

export type SavePayload = {
  content: SerializedEditorState;
  newItem?: CollectionItem;
  existingItem?: BrowsableItemResult;
};

type SaveSessionModalProps = {
  onClose: (payload?: SavePayload) => void;
};

const SaveSessionModal = ({ onClose }: SaveSessionModalProps) => {
  const { t } = useLingui();

  const [selectedItem, setSelectedItem] = useState<BrowsableItemResult | null>(
    null
  );
  const content = store.getValue('tempDoc');

  const query = useFetchBrowsableItemsQuery(
    'SaveSessionModal',
    resumeService.getCurrentFolder()
  );
  const [parentId, setParentId] = useFetchBrowsableItemsQueryParamsState(query);
  const items = useQueryResults(query);

  const tempItem = useMemo(() => {
    const { item } = collectionService.getNewDocumentObj(parentId);
    item.title = t`timed session ` + dateToStr('iso');
    return { ...item, id: '__temp__' };
  }, [parentId, t]);

  const finalItems = selectedItem
    ? [...items]
    : [
        { ...tempItem, title: tempItem.title + t` (new)`, lastActivityAt: 0 },
        ...items
      ];

  return (
    <>
      <IonHeader>
        <IonTitle>
          <Trans>Choose where to save your work</Trans>
        </IonTitle>
        <CollectionItemBreadcrumb
          minBreadcrumb={0}
          folderId={parentId}
          onClick={item => {
            setParentId(item);
          }}
        />
      </IonHeader>
      <CollectionItemList
        items={finalItems}
        onSelectedItem={selected => {
          if (selected.type === CollectionItemType.folder) {
            setParentId(selected.id);
          } else if (selected.id === selectedItem?.id) {
            // unselect document -> the temp document will be created
            setSelectedItem(null);
          } else {
            setSelectedItem(selected);
          }
        }}
        selected={selectedItem?.id}
      />

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
                const payload: SavePayload = {
                  content: JSON.parse(content!)
                };
                if (!selectedItem) {
                  payload.newItem = { ...tempItem, parentId };
                } else {
                  payload.existingItem = selectedItem;
                  // merge existing content with new
                  payload.content =
                    collectionService.appendUnsavedLexicalContent(
                      selectedItem.id,
                      payload.content
                    );
                }
                onClose(payload);
              }}
            >
              {!selectedItem ? <Trans>Save</Trans> : <Trans>Merge</Trans>}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonFooter>
    </>
  );
};

export default SaveSessionModal;
