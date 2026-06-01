import { GET_DOCUMENT_ROUTE } from '@/common/routes';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import { searchAncestryService } from '@/search/search-ancestry.service';
import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonList,
  IonRadio,
  IonRadioGroup,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { useState } from 'react';
import { Id } from 'tinybase/with-schemas';
import { pageMigrationService } from '../page-migration.service';

type ExplodeDocModalProps = {
  id: Id;
  dismiss: () => void;
  close?: () => void;
  showContext?: boolean;
};

const ExplodeDocModal = ({
  id,
  dismiss,
  close,
  showContext = false
}: ExplodeDocModalProps) => {
  const [mode, setMode] = useState<'to-docs' | 'to-notes'>('to-notes');
  const [removeHeading, setRemoveHeading] = useState(true);
  const [createGroup, setCreateGroup] = useState(true);
  const title = collectionService.getItemTitle(id);
  const parent = collectionService.getItemParent(id);
  const preview = searchAncestryService.getItemPreview(id);
  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Choose how to convert your pages.</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          {showContext && (
            <IonItem>
              <IonIcon icon={APPICONS.document} slot="start" />
              <IonText>
                <p>{title}</p>
                <p>
                  <i>{preview.substring(0, 100)}</i>
                </p>
              </IonText>
              <IonButton
                slot={'end'}
                onClick={() => {
                  if (close) close();
                }}
                routerLink={GET_DOCUMENT_ROUTE(parent, id)}
              >
                <IonIcon icon={APPICONS.goIntoAction} />
              </IonButton>
            </IonItem>
          )}
          <IonRadioGroup
            value={mode}
            onIonChange={v => setMode(v.detail.value)}
          >
            <IonItem>
              <IonRadio value={'to-notes'}>convert to notes 💬</IonRadio>
            </IonItem>
            <IonItem>
              <IonRadio value={'to-docs'}>convert to documents 📄</IonRadio>
            </IonItem>
          </IonRadioGroup>

          {mode === 'to-docs' && (
            <>
              <IonItem>
                remove first heading from content
                <IonCheckbox
                  slot="end"
                  checked={removeHeading}
                  onIonChange={() => setRemoveHeading(!removeHeading)}
                />
              </IonItem>
              <IonItem>
                create folder group
                <IonCheckbox
                  slot="end"
                  checked={createGroup}
                  onIonChange={() => setCreateGroup(!createGroup)}
                />
              </IonItem>
            </>
          )}
        </IonList>
      </IonContent>
      <IonFooter>
        <IonToolbar>
          <IonButtons slot="end">
            <IonButton onClick={() => dismiss()}>Cancel</IonButton>
            <IonButton
              onClick={() => {
                console.debug('converting doc', id, mode);
                if (mode === 'to-docs') {
                  pageMigrationService.explodeToDocuments(
                    id,
                    createGroup,
                    removeHeading
                  );
                } else if (mode === 'to-notes') {
                  pageMigrationService.explodeToNotes(id);
                }
                dismiss();
              }}
            >
              Confirm
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonFooter>
    </>
  );
};

export default ExplodeDocModal;
