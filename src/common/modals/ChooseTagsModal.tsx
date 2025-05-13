import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import tagsService from '@/db/tags.service';
import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import React from 'react';

type ChooseTagsModalProps = {
  id: string;
  onClose: (tags?: string[]) => void;
} & React.HTMLAttributes<HTMLIonModalElement>;

const ChooseTagsModal = ({ id, onClose }: ChooseTagsModalProps) => {
  const { t } = useLingui();
  const itemTags = collectionService.useItemTags(id);
  const allTags = tagsService.getTags();
  let inputValue: string | undefined = undefined;
  const values = [...allTags].map(tag => ({ tag, checked: itemTags.has(tag) }));

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            <Trans>Select item tags</Trans>
          </IonTitle>

          <IonButtons slot="end">
            <IonButton onClick={() => onClose()}>
              <IonIcon icon={APPICONS.closeAction} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      {allTags.length === 0 && (
        <IonItem>
          <Trans>No tag yet</Trans>
        </IonItem>
      )}
      {allTags.length > 0 && (
        <IonList style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {values.map(value => (
            <IonItem key={value.tag}>
              <IonInput
                value={value.tag}
                onIonChange={e => {
                  const newValue = e.detail.value;
                  if (
                    newValue &&
                    newValue.length > 0 &&
                    !allTags.find(t => t === newValue)
                  ) {
                    tagsService.renameTag(value.tag, newValue);
                  }
                }}
              ></IonInput>
              <IonCheckbox
                slot="end"
                checked={value.checked}
                onIonChange={e => {
                  value.checked = e.detail.checked;
                }}
              ></IonCheckbox>
            </IonItem>
          ))}
        </IonList>
      )}
      <IonFooter>
        <IonInput
          style={{ marginLeft: '16px' }}
          placeholder={t`New tag`}
          slot="start"
          value={inputValue}
          onIonChange={e => {
            const newValue = e.detail.value;
            if (newValue && !itemTags.has(newValue)) {
              tagsService.addItemTag(id, newValue);
            }
            inputValue = undefined;
          }}
          maxlength={50}
        ></IonInput>
        <IonToolbar>
          <IonButtons slot="end">
            <IonButton onClick={() => onClose()}>
              <Trans>Cancel</Trans>
            </IonButton>
            <IonButton
              onClick={() =>
                onClose(values.filter(v => v.checked).map(v => v.tag))
              }
            >
              <Trans>Confirm</Trans>
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonFooter>
    </>
  );
};
export default ChooseTagsModal;
