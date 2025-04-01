import {
  IonBreadcrumb,
  IonBreadcrumbs,
  IonButton,
  IonIcon
} from '@ionic/react';
import { home } from 'ionicons/icons';
import { useState } from 'react';
import { ROOT_FOLDER } from '../../constants';
import documentsService from '../../db/documents.service';

const DocumentNodeBreadcrumb = ({
  folder,
  id,
  onClick
}: {
  folder: string;
  id?: string;
  onClick?: (node: string) => void;
}) => {
  const [maxBreadcrumbs, setMaxBreadcrumbs] = useState<number | undefined>(3);
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);

  if (!breadcrumb.find(b => b === folder)) {
    setBreadcrumb(documentsService.getBreadcrumb(id ? id : folder));
    setMaxBreadcrumbs(3);
  }

  return (
    <IonBreadcrumbs
      style={{ marginLeft: '4px', overflowX: 'auto', flexWrap: 'nowrap' }}
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
            {node === ROOT_FOLDER && <IonIcon icon={home} />}
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
