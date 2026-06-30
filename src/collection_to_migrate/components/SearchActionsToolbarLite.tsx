import { APPICONS } from '@/constants';
import type { InputCustomEvent, JSX } from '@ionic/core/components';
import { IonButton, IonButtons, IonIcon, IonInput } from '@ionic/react';
import { StyleReactProps } from '@ionic/react/dist/types/components/react-component-lib/interfaces';
import { useEffect, useRef } from 'react';

export type SearchActionsToolbarLiteProps = {
  searchText: string;
  toggleSearchAutoFocus?: boolean;
  onValue?: (text: string) => void;
} & JSX.IonToolbar &
  StyleReactProps &
  React.HTMLAttributes<HTMLIonToolbarElement>;

const SearchActionsToolbarLite = ({
  searchText,
  toggleSearchAutoFocus = true,
  onValue
}: SearchActionsToolbarLiteProps) => {
  const refInput = useRef<HTMLIonInputElement>(null);
  useEffect(() => {
    if (toggleSearchAutoFocus && refInput.current) {
      setTimeout(() => refInput.current!.setFocus());
    }
  }, [refInput, toggleSearchAutoFocus]);
  return (
    <>
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
        <IonButton>
          <IonIcon icon={APPICONS.search}></IonIcon>
        </IonButton>
      </IonButtons>
    </>
  );
};
export default SearchActionsToolbarLite;
