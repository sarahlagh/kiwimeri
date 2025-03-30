import {
  IonContent,
  IonHeader,
  IonMenu,
  IonPage,
  IonSplitPane
} from '@ionic/react';
import { ReactNode } from 'react';
import platformService from '../../common/services/platform.service';
import MainHeader, { MainHeaderProps } from '../components/MainHeader';

type TemplateCompactableSplitPageProps = {
  headerIfCompact: MainHeaderProps;
  headerIfWide: MainHeaderProps;
  menu: ReactNode;
  contentId: string;
  when?: string;
} & {
  readonly children?: ReactNode;
};

const TemplateCompactableSplitPage = ({
  headerIfCompact,
  headerIfWide,
  menu,
  when,
  contentId,
  children
}: TemplateCompactableSplitPageProps) => {
  const isWideEnough = platformService.isWideEnough();
  return (
    <IonPage>
      {!isWideEnough && (
        <IonHeader>
          <MainHeader
            title={headerIfCompact.title}
            editable={headerIfCompact.editable}
            onIonInput={headerIfCompact.onIonInput}
          >
            {headerIfCompact.children}
          </MainHeader>
        </IonHeader>
      )}
      {isWideEnough && (
        <IonHeader>
          <MainHeader
            title={headerIfWide.title}
            editable={headerIfWide.editable}
            onIonInput={headerIfWide.onIonInput}
          >
            {headerIfWide.children}
          </MainHeader>
        </IonHeader>
      )}

      {/* content */}
      <IonContent>
        <IonSplitPane when={when || 'md'} contentId={contentId}>
          <IonMenu contentId={contentId}>{menu}</IonMenu>

          <div className="ion-page" id={contentId}>
            {children}
          </div>
        </IonSplitPane>
      </IonContent>
    </IonPage>
  );
};
export default TemplateCompactableSplitPage;
