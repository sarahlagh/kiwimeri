import { APPICONS, ROOT_COLLECTION } from '@/constants';
import collectionService from '@/db/collection.service';
import {
  IonBreadcrumb,
  IonBreadcrumbs,
  IonButton,
  IonIcon
} from '@ionic/react';
import { useState } from 'react';

const CollectionItemBreadcrumb = ({
  folder,
  onClick
}: {
  folder: string;
  onClick?: (item: string) => void;
}) => {
  const [maxBreadcrumbs, setMaxBreadcrumbs] = useState<number | undefined>(3);
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);

  if (folder !== ROOT_COLLECTION && !breadcrumb.find(b => b === folder)) {
    setBreadcrumb(collectionService.getBreadcrumb(folder));
    setMaxBreadcrumbs(3);
  }

  if (breadcrumb.length < 2) {
    return <></>;
  }

  return (
    <IonBreadcrumbs
      style={{ marginLeft: '18px', overflowX: 'auto', flexWrap: 'nowrap' }}
      maxItems={maxBreadcrumbs}
      itemsBeforeCollapse={0}
      itemsAfterCollapse={2}
      onIonCollapsedClick={e => {
        e.stopImmediatePropagation();
        setMaxBreadcrumbs(undefined);
      }}
    >
      {breadcrumb.map((item, idx) => (
        <IonBreadcrumb key={item}>
          {/* bug (?) with routerLink where onIonCollapsedClick doesn't prevent propagation to link
          so, using onClick on inner button instead
          and anyway, I don't always want links */}
          <IonButton
            fill="clear"
            color={item === folder ? 'dark' : 'medium'}
            onClick={() => {
              if (onClick) onClick(item);
            }}
          >
            {idx === 0 && <IonIcon icon={APPICONS.home} />}
            {idx > 0 && <>{collectionService.getItemTitle(item)}</>}
          </IonButton>
        </IonBreadcrumb>
      ))}
    </IonBreadcrumbs>
  );
};

export default CollectionItemBreadcrumb;
