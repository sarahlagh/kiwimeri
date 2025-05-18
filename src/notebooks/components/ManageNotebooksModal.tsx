import { APPICONS } from '@/constants';
import notebooksService from '@/db/notebooks.service';
import {
  IonButton,
  IonButtons,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonRadio,
  IonRadioGroup,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import React from 'react';
import { getUniqueId } from 'tinybase/with-schemas';

type ManageNotebooksModalProps = {
  onClose: (tags?: string[]) => void;
} & React.HTMLAttributes<HTMLIonModalElement>;

const ManageNotebooksModal = ({ onClose }: ManageNotebooksModalProps) => {
  const notebooks = notebooksService.useNotebooks();
  const current = notebooksService.useCurrentNotebook();
  console.debug('notebooks', notebooks);

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            <Trans>Notebook Selection</Trans>
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonRadioGroup
        value={current}
        onIonChange={e => {
          const newId = e.detail.value;
          notebooksService.setCurrentNotebook(newId);
        }}
      >
        <IonList style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {notebooks.map(notebook => (
            <IonItem key={notebook.id}>
              <IonInput
                value={notebook.name}
                placeholder={notebook.name}
                onIonChange={e => {
                  const newValue = e.detail.value;
                  if (
                    newValue &&
                    newValue.length > 0 &&
                    !notebooks.find(t => t.name === newValue)
                  ) {
                    notebooksService.setNotebookName(notebook.id!, newValue);
                  }
                }}
              ></IonInput>
              {current !== notebook.id && (
                <IonButton
                  color={'danger'}
                  fill="clear"
                  onClick={() => {
                    // TODO ask confirmation
                    notebooksService.deleteNotebook(notebook.id!);
                  }}
                >
                  <IonIcon icon={APPICONS.deleteAction}></IonIcon>
                </IonButton>
              )}
              <IonRadio value={notebook.id}></IonRadio>
            </IonItem>
          ))}
        </IonList>
      </IonRadioGroup>
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
            <IonButton onClick={() => onClose()}>
              <Trans>Confirm</Trans>
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonFooter>
    </>
  );
};
export default ManageNotebooksModal;
