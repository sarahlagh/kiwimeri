import { IonHeader, IonPage } from '@ionic/react';
import { ReactNode } from 'react';
import MainHeader, { MainHeaderProps } from '../components/MainHeader';

type TemplateMainPageProps = MainHeaderProps & {
  readonly children?: ReactNode;
};

const TemplateMainPage = ({
  title,
  editable,
  onIonInput,
  children
}: TemplateMainPageProps) => {
  return (
    <IonPage>
      <IonHeader>
        <MainHeader
          title={title}
          editable={editable}
          onIonInput={onIonInput}
        ></MainHeader>
      </IonHeader>
      {children}
    </IonPage>
  );
};
export default TemplateMainPage;
