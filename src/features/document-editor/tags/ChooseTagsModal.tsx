import { APPICONS } from '@/constants';
import collectionService from '@/domain/collection/collection.service';
import tagsService from '@/domain/collection/tags.service';
import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
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
import React, { useReducer, useState } from 'react';

type ChooseTagsModalProps = {
  id: string;
  onClose: (tags?: string[]) => void;
} & React.HTMLAttributes<HTMLIonModalElement>;

function initializeTags(itemTags: Set<string>) {
  tagsService.reBuildTags();
  const allTags = tagsService.getTags();
  return [...allTags].map(tag => ({ tag, checked: itemTags.has(tag) }));
}

function tagsReducer(
  state: { tag: string; checked: boolean }[],
  action:
    | {
        type: 'check';
        tag: string;
        checked: boolean;
      }
    | {
        type: 'add';
        tag: string;
      }
) {
  if (action.type === 'check') {
    const tag = state.find(t => t.tag === action.tag);
    if (tag) tag.checked = action.checked;
  }
  switch (action.type) {
    case 'check':
      state.find(t => t.tag === action.tag)!.checked = action.checked;
      return state;
    case 'add':
      return [...state, { tag: action.tag, checked: true }];
  }
}

const ChooseTagsModal = ({ id, onClose }: ChooseTagsModalProps) => {
  const { t } = useLingui();
  const itemTags = collectionService.getItemTags(id);
  const [inputValue, setInputValue] = useState<string>();

  const [allNotebookTags, dispatch] = useReducer(
    tagsReducer,
    itemTags,
    initializeTags
  );

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
      <IonContent>
        <IonList>
          {allNotebookTags.length === 0 && (
            <IonItem>
              <Trans>No tag yet</Trans>
            </IonItem>
          )}
          {allNotebookTags.map(value => (
            <IonItem key={value.tag}>
              <IonInput
                value={value.tag}
                onIonChange={e => {
                  const newValue = e.detail.value;
                  if (
                    newValue &&
                    newValue.length > 0 &&
                    !allNotebookTags.find(t => t.tag === newValue)
                  ) {
                    tagsService.renameTag(value.tag, newValue);
                  }
                }}
              ></IonInput>
              <IonCheckbox
                slot="end"
                checked={value.checked}
                onIonChange={e => {
                  dispatch({
                    type: 'check',
                    tag: value.tag,
                    checked: e.detail.checked
                  });
                }}
              ></IonCheckbox>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
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
              dispatch({
                type: 'add',
                tag: newValue
              });
            }
            setInputValue(undefined); // clears the input
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
                onClose(allNotebookTags.filter(v => v.checked).map(v => v.tag))
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
