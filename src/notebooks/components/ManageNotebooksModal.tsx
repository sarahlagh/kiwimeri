import CollectionItemList from '@/collection/components/CollectionItemList';
import { APPICONS } from '@/constants';
import notebooksService from '@/db/notebooks.service';
import {
  IonButton,
  IonButtons,
  IonFooter,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import React, { useState } from 'react';
import { getUniqueId } from 'tinybase/with-schemas';

type ManageNotebooksModalProps = {
  onClose: (tags?: string[]) => void;
} & React.HTMLAttributes<HTMLIonModalElement>;

const ManageNotebooksModal = ({ onClose }: ManageNotebooksModalProps) => {
  const notebooks = notebooksService.useNotebooks();
  const current = notebooksService.useCurrentNotebook();
  const [selected, setSelected] = useState<string>(current);
  const [itemRenaming, setItemRenaming] = useState<string | undefined>(
    undefined
  );
  console.debug('notebooks', notebooks);

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            <Trans>Notebook Selection</Trans>
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => onClose()}>
              <IonIcon icon={APPICONS.closeAction} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <CollectionItemList
        items={notebooks}
        selected={selected}
        onSelectedItem={item => {
          setSelected(item.id);
          setItemRenaming(undefined);
        }}
        itemRenaming={itemRenaming}
        onRenamingDone={() => {
          setItemRenaming(undefined);
        }}
        actionVisible={item => item.id !== current}
        actionsIcon={APPICONS.deleteAction}
        onClickActions={(e, item, confirm) => {
          setItemRenaming(undefined);
          confirm(item.id, choice => {
            if (choice) {
              notebooksService.deleteNotebook(item.id);
            }
          });
        }}
      ></CollectionItemList>
      <IonFooter>
        <IonToolbar>
          <IonButtons slot="end">
            <IonButton
              onClick={() => {
                const uuid = getUniqueId();
                notebooksService.addNotebook(`new notebook (${uuid})`);
              }}
            >
              <IonIcon icon={APPICONS.addGeneric}></IonIcon>
            </IonButton>
            <IonButton
              onClick={() => {
                setItemRenaming(selected);
              }}
            >
              <IonIcon icon={APPICONS.renameAction}></IonIcon>
            </IonButton>
            <IonButton
              onClick={() => {
                if (selected !== current) {
                  notebooksService.setCurrentNotebook(selected);
                }
                onClose();
              }}
            >
              <Trans>Confirm</Trans>
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonFooter>
    </>
  );
};
export default ManageNotebooksModal;
