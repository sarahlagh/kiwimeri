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
import React, { useState } from 'react';
import { getUniqueId } from 'tinybase/with-schemas';
import { NotebookResult } from '../notebooks';

type ManageNotebooksModalProps = {
  onClose: (tags?: string[]) => void;
} & React.HTMLAttributes<HTMLIonModalElement>;

const ManageNotebooksModal = ({ onClose }: ManageNotebooksModalProps) => {
  const notebooks = notebooksService.useNotebooks();
  const current = notebooksService.useCurrentNotebook();
  const [idDeleting, setIdDeleting] = useState<string>();
  console.debug('notebooks', notebooks);

  const NotebookRow = ({ notebook }: { notebook: NotebookResult }) => {
    return (
      <>
        <IonInput
          value={notebook.title}
          placeholder={notebook.title}
          onIonChange={e => {
            const newValue = e.detail.value;
            if (
              newValue &&
              newValue.length > 0 &&
              !notebooks.find(t => t.title === newValue)
            ) {
              notebooksService.setNotebookTitle(notebook.id!, newValue);
            }
          }}
        ></IonInput>
        {current !== notebook.id && (
          <IonButton
            color={'danger'}
            fill="clear"
            onClick={() => {
              setIdDeleting(notebook.id);
            }}
          >
            <IonIcon icon={APPICONS.deleteAction}></IonIcon>
          </IonButton>
        )}
        <IonRadio value={notebook.id}></IonRadio>
      </>
    );
  };

  const AreYouSure = ({ id }: { id: string }) => {
    return (
      <>
        <Trans>Are you sure?</Trans>
        <IonButtons slot="end">
          <IonButton
            color="success"
            fill="solid"
            onClick={() => {
              notebooksService.deleteNotebook(id);
              setIdDeleting(undefined);
            }}
          >
            <Trans>yes</Trans>
          </IonButton>
          <IonButton fill="solid" onClick={() => setIdDeleting(undefined)}>
            <Trans>no</Trans>
          </IonButton>
        </IonButtons>
      </>
    );
  };

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
            <IonItem
              key={notebook.id}
              color={idDeleting === notebook.id ? 'danger' : undefined}
            >
              {idDeleting !== notebook.id && (
                <NotebookRow notebook={notebook} />
              )}
              {idDeleting === notebook.id && <AreYouSure id={notebook.id!} />}
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
