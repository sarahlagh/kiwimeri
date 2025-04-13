import MainHeader, { MainHeaderProps } from '@/app/components/MainHeader';
import { IonHeader, IonPage } from '@ionic/react';
import { ReactNode } from 'react';

type TemplateMainPageProps = MainHeaderProps & {
  readonly children?: ReactNode;
};

const TemplateMainPage = ({
  title,
  editable,
  onEdited,
  children
}: TemplateMainPageProps) => {
  return (
    <IonPage>
      <IonHeader>
        <MainHeader
          title={title}
          editable={editable}
          onEdited={onEdited}
        ></MainHeader>
      </IonHeader>
      {children}
    </IonPage>
  );
};
export default TemplateMainPage;
