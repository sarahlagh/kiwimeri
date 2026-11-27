import { APPICONS } from '@/constants';
import collectionService from '@/domain/collection/collection.service';
import {
  IonBreadcrumb,
  IonBreadcrumbs,
  IonButton,
  IonButtons,
  IonIcon
} from '@ionic/react';
import { ReactNode, useMemo, useState } from 'react';

type CollectionItemBreadcrumbProps = {
  folderId: string;
  onClick?: (item: string) => void;
  minBreadcrumb?: number;
} & {
  readonly children?: ReactNode;
};

const CollectionItemBreadcrumb = ({
  folderId,
  onClick,
  minBreadcrumb = 2,
  children
}: CollectionItemBreadcrumbProps) => {
  // TODO if rename folder, component not rerendered
  const [maxBreadcrumbs, setMaxBreadcrumbs] = useState<number | undefined>(3);

  const breadcrumb = useMemo(
    () => collectionService.getBreadcrumb(folderId),
    [folderId]
  );

  const checkedBreadcrumb = breadcrumb.filter(id =>
    collectionService.itemExists(id)
  );

  if (checkedBreadcrumb.length < minBreadcrumb) {
    return <></>;
  }

  return (
    <IonBreadcrumbs
      style={{
        marginLeft: '18px',
        overflowX: 'auto',
        flexWrap: 'nowrap',
        padding: '0'
      }}
      maxItems={maxBreadcrumbs}
      itemsBeforeCollapse={0}
      itemsAfterCollapse={2}
      onIonCollapsedClick={e => {
        e.stopImmediatePropagation();
        setMaxBreadcrumbs(undefined);
      }}
    >
      {checkedBreadcrumb.map((item, idx) => (
        <IonBreadcrumb key={item}>
          {/* bug (?) with routerLink where onIonCollapsedClick doesn't prevent propagation to link
          so, using onClick on inner button instead
          and anyway, I don't always want links */}
          <IonButton
            fill="clear"
            color={item === folderId ? 'dark' : 'medium'}
            onClick={() => {
              if (onClick) onClick(item);
            }}
          >
            {idx === 0 && <IonIcon icon={APPICONS.home} />}
            {idx > 0 && <>{collectionService.getItemTitle(item)}</>}
          </IonButton>
        </IonBreadcrumb>
      ))}
      <IonButtons style={{ marginLeft: 'auto' }}>{children}</IonButtons>
    </IonBreadcrumbs>
  );
};

export default CollectionItemBreadcrumb;
