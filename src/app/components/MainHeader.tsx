import {
  IonButtons,
  IonInput,
  IonMenuButton,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { ReactNode } from 'react';

interface MainHeaderProps {
  title: string;
  editable?: boolean;
  onIonInput?: (e: Event) => void;
}

const MainHeader = ({
  title,
  editable = false,
  onIonInput,
  children
}: MainHeaderProps & { readonly children?: ReactNode }) => {
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
