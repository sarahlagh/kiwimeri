import MainHeader, { MainHeaderProps } from '@/app/components/MainHeader';
import { MAIN_CONTENT_ID } from '@/constants';
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
    <IonPage id={MAIN_CONTENT_ID}>
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
