import {
  IonButtons,
  IonInput,
  IonMenuButton,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { ReactNode } from 'react';

export type MainHeaderProps = {
  title: string;
  editable?: boolean;
  onIonInput?: (e: Event) => void;
} & { readonly children?: ReactNode };

const MainHeader = ({
  title,
  editable = false,
  onIonInput,
  children
}: MainHeaderProps) => {
  return (
    <IonToolbar>
      <IonButtons slot="start">
        <IonMenuButton></IonMenuButton>
      </IonButtons>
      {!editable && <IonTitle>{title}</IonTitle>}
      {editable && (
        <IonInput
          class="invisible"
          value={title}
          onIonInput={onIonInput}
        ></IonInput>
      )}

      <IonButtons slot="end">{children}</IonButtons>
    </IonToolbar>
  );
};

export default MainHeader;
