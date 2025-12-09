import { APPICONS } from '@/constants';
import type { InputCustomEvent, JSX } from '@ionic/core/components';
import {
  IonButton,
  IonButtons,
  IonIcon,
  IonInput,
  IonToolbar
} from '@ionic/react';
import { StyleReactProps } from '@ionic/react/dist/types/components/react-component-lib/interfaces';
import { Dispatch, useEffect, useRef } from 'react';

export type SearchActionsToolbarProps = {
  searchText: string;
  setSearchText: Dispatch<string>;
  setToggleSearch: Dispatch<boolean>;
  rows?: number;
} & JSX.IonToolbar &
  StyleReactProps &
  React.HTMLAttributes<HTMLIonToolbarElement>;

const SearchActionsToolbar = ({
  setSearchText,
  setToggleSearch,
  searchText,
  rows = 1
}: SearchActionsToolbarProps) => {
  const refInput = useRef<HTMLIonInputElement>(null);
  useEffect(() => {
    if (refInput.current) {
      setTimeout(() => refInput.current!.setFocus());
    }
  }, [refInput]);
  return (
    <IonToolbar color="medium" style={{ height: rows * 56 + 'px' }}>
      <IonInput
        ref={refInput}
        style={{ marginLeft: 8 }}
        class="invisible"
        value={searchText}
        onIonInput={(e: InputCustomEvent) => {
          setSearchText(e.detail.value || '');
        }}
      ></IonInput>
      <IonButtons slot="end">
        <IonButton
          onClick={() => {
            setToggleSearch(false);
          }}
        >
          <IonIcon icon={APPICONS.closeAction}></IonIcon>
        </IonButton>
      </IonButtons>
    </IonToolbar>
  );
};
export default SearchActionsToolbar;
