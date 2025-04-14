import { APPICONS, FAKE_ROOT, ROOT_FOLDER } from '@/constants';
import documentsService from '@/db/documents.service';
import {
  IonBreadcrumb,
  IonBreadcrumbs,
  IonButton,
  IonIcon
} from '@ionic/react';
import { useState } from 'react';

const DocumentNodeBreadcrumb = ({
  folder,
  onClick
}: {
  folder: string;
  onClick?: (node: string) => void;
}) => {
  const [maxBreadcrumbs, setMaxBreadcrumbs] = useState<number | undefined>(3);
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);

  if (folder !== FAKE_ROOT && !breadcrumb.find(b => b === folder)) {
    setBreadcrumb(documentsService.getBreadcrumb(folder));
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
      {breadcrumb.map(node => (
        <IonBreadcrumb key={node}>
          {/* bug (?) with routerLink where onIonCollapsedClick doesn't prevent propagation to link
          so, using onClick on inner button instead
          and anyway, I don't always want links */}
          <IonButton
            fill="clear"
            color={node === folder ? 'dark' : 'medium'}
            onClick={() => {
              if (onClick) onClick(node);
            }}
          >
            {node === ROOT_FOLDER && <IonIcon icon={APPICONS.home} />}
            {node !== ROOT_FOLDER && (
              <>{documentsService.getDocumentNodeTitle(node)}</>
            )}
          </IonButton>
        </IonBreadcrumb>
      ))}
    </IonBreadcrumbs>
  );
};

export default DocumentNodeBreadcrumb;
