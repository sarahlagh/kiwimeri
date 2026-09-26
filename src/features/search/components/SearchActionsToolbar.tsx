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
  const inputRef = useRef<HTMLIonInputElement>(null);
  useEffect(() => {
    if (!toggleSearchAutoFocus || !inputRef.current) return;
    const timeout = setTimeout(() => inputRef.current!.setFocus());
    return () => clearTimeout(timeout);
  }, [toggleSearchAutoFocus]);
  return (
    <IonToolbar color="medium" style={{ height: rows * 56 + 'px' }}>
      <IonInput
        ref={inputRef}
        style={{ marginLeft: 8 }}
        className="invisible"
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
