import { APPICONS } from '@/constants';
import type { InputCustomEvent, JSX } from '@ionic/core/components';
import { IonButton, IonButtons, IonIcon, IonInput } from '@ionic/react';
import { StyleReactProps } from '@ionic/react/dist/types/components/react-component-lib/interfaces';
import { useEffect, useRef } from 'react';

export type GenericSearchInlineProps = {
  searchText: string;
  onSearch: (val: string) => void;
  toggleSearchAutoFocus?: boolean;
};

export type SearchActionsToolbarLiteProps = GenericSearchInlineProps &
  JSX.IonToolbar &
  StyleReactProps &
  React.HTMLAttributes<HTMLIonToolbarElement>;

const GenericSearchInline = ({
  searchText,
  toggleSearchAutoFocus = true,
  onSearch
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
          onSearch(e.detail.value || '');
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
export default GenericSearchInline;
