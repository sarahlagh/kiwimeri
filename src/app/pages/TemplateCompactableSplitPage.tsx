import MainHeader, { MainHeaderProps } from '@/app/components/MainHeader';
import platformService from '@/common/services/platform.service';
import {
  IonContent,
  IonHeader,
  IonMenu,
  IonPage,
  IonSplitPane,
  MenuCustomEvent
} from '@ionic/react';
import { ReactNode, useEffect, useRef } from 'react';

type TemplateCompactableSplitPageProps = {
  headerIfCompact: MainHeaderProps;
  headerIfWide: MainHeaderProps;
  menu: ReactNode;
  contentId: string;
  when?: string;
  onMenuClose?: (ev: MenuCustomEvent) => void;
} & {
  readonly children?: ReactNode;
};

const TemplateCompactableSplitPage = ({
  headerIfCompact,
  headerIfWide,
  menu,
  when,
  contentId,
  onMenuClose,
  children
}: TemplateCompactableSplitPageProps) => {
  const isWideEnough = platformService.isWideEnough();
  const menuRef = useRef<HTMLIonMenuElement>(null);

  useEffect(() => {
    const menu = menuRef.current;
    if (menu && onMenuClose) {
      menu.addEventListener('ionDidClose', onMenuClose);
    }
    return () => {
      if (menu && onMenuClose) {
        menu.removeEventListener('ionDidClose', onMenuClose);
      }
    };
  }, [menuRef.current]);

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
          <IonMenu ref={menuRef} menuId="document-menu" contentId={contentId}>
            {menu}
          </IonMenu>

          <div className="ion-page" id={contentId}>
            {children}
          </div>
        </IonSplitPane>
      </IonContent>
    </IonPage>
  );
};
export default TemplateCompactableSplitPage;
