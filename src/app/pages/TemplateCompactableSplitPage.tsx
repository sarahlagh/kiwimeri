import MainHeader, { MainHeaderProps } from '@/app/components/MainHeader';
import platformService from '@/common/services/platform.service';
import {
  IonContent,
  IonHeader,
  IonMenu,
  IonPage,
  IonSplitPane
} from '@ionic/react';
import { ReactNode } from 'react';

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
          <MainHeader {...headerIfCompact}>
            {headerIfCompact.children}
          </MainHeader>
        </IonHeader>
      )}
      {isWideEnough && (
        <IonHeader>
          <MainHeader {...headerIfWide}>{headerIfWide.children}</MainHeader>
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
