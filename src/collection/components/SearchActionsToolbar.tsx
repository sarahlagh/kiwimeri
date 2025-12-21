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
  setToggleSearch: Dispatch<boolean>;
  toggleSearchAutoFocus?: boolean;
  rows?: number;
  onValue?: (text: string) => void;
  onClose?: () => void;
} & JSX.IonToolbar &
  StyleReactProps &
  React.HTMLAttributes<HTMLIonToolbarElement>;

const SearchActionsToolbar = ({
  setToggleSearch,
  searchText,
  toggleSearchAutoFocus = true,
  rows = 1,
  onValue,
  onClose
}: SearchActionsToolbarProps) => {
  const refInput = useRef<HTMLIonInputElement>(null);
  useEffect(() => {
    if (toggleSearchAutoFocus && refInput.current) {
      setTimeout(() => refInput.current!.setFocus());
    }
  }, [refInput, toggleSearchAutoFocus]);
  return (
    <IonToolbar color="medium" style={{ height: rows * 56 + 'px' }}>
      <IonInput
        ref={refInput}
        style={{ marginLeft: 8 }}
        class="invisible"
        value={searchText}
        onIonInput={(e: InputCustomEvent) => {
          if (onValue) onValue(e.detail.value || '');
        }}
      ></IonInput>
      <IonButtons slot="end">
        <IonButton
          onClick={() => {
            setToggleSearch(false);
            if (onValue) onValue('');
            if (onClose) onClose();
          }}
        >
          <IonIcon icon={APPICONS.closeAction}></IonIcon>
        </IonButton>
      </IonButtons>
    </IonToolbar>
  );
};
export default SearchActionsToolbar;
