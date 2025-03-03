import {
  IonButtons,
  IonInput,
  IonMenuButton,
  IonTitle,
  IonToolbar
} from '@ionic/react';

interface MainHeaderProps {
  title: string;
  editable?: boolean;
  onIonInput?: (e: Event) => void;
}

const MainHeader = ({
  title,
  editable = false,
  onIonInput
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
    </IonToolbar>
  );
};

export default MainHeader;
