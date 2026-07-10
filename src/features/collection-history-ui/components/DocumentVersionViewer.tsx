import { GET_DOCUMENT_ROUTE, GET_VERSIONED_ROUTE } from '@/app/routes';
import { APPICONS } from '@/constants';
import { CollectionItemSnapshotData } from '@/domain/collection/collection';
import collectionService from '@/domain/collection/collection.service';
import {} from '@/features/collection-item-actions';
import { SearchActionsToolbar } from '@/features/search';
import {
  IonButton,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import useVersion from '../hooks/useVersion';

const ActionsFromDocumentVersionViewerToolbar = lazy(() =>
  import('@/features/collection-item-actions').then(m => ({
    default: m.ActionsFromDocumentVersionViewerToolbar
  }))
);

const KiwimeriEditor = lazy(() =>
  import('@/features/document-editor').then(m => ({
    default: m.KiwimeriEditor
  }))
);

interface DocumentVersionViewerProps {
  docId: string;
  docVersion: string;
  showActions?: boolean;
  folder: string;
  query?: string;
}

const DocumentVersionFooter = ({
  versionData
}: {
  versionData: CollectionItemSnapshotData;
}) => {
  const itemTags: string[] = versionData.tags || [];
  return (
    <IonFooter
      style={{ overflowX: 'auto', flexWrap: 'nowrap', display: 'flex' }}
    >
      <IonItem className="inner-item">
        <IonText>{itemTags.join(', ')}</IonText>
      </IonItem>
    </IonFooter>
  );
};

const DocumentVersionViewer = ({
  docId,
  docVersion,
  showActions = false,
  folder,
  query
}: DocumentVersionViewerProps) => {
  const navigate = useNavigate();
  const [showDocumentActions, setShowDocumentActions] =
    useState<boolean>(false);
  const [toggleSearch, setToggleSearch] = useState(false);
  const [toggleSearchAutoFocus, setToggleSearchAutoFocus] = useState(true);
  // TODO refactor
  useEffect(() => {
    setShowDocumentActions(showActions);
  }, [showActions]);

  const versionedDoc = useVersion(docVersion);
  const content = versionedDoc?.content;
  const versionData = versionedDoc?.snapshotJson;
  const documentTitle = versionData?.title;
  const parentId = collectionService.getItemParent(docId);

  useEffect(() => {
    if (query) {
      setToggleSearch(query.length > 0);
      setToggleSearchAutoFocus(false);
    }
  }, [query, docId]);

  return (
    <>
      <IonHeader>
        {/*only visible in non compact mode*/}
        <IonToolbar class="ion-hide-md-down" color="tertiary">
          <IonTitle>
            <IonLabel>{documentTitle}</IonLabel>
          </IonTitle>
          <IonButton
            slot="end"
            fill="clear"
            color={'dark'}
            onClick={() => {
              setShowDocumentActions(!showDocumentActions);
              setToggleSearch(false);
            }}
          >
            <IonIcon icon={APPICONS.itemActions}></IonIcon>
          </IonButton>
        </IonToolbar>
        {showDocumentActions && (
          <Suspense>
            <ActionsFromDocumentVersionViewerToolbar
              docId={docId}
              getBackRoute={() => GET_DOCUMENT_ROUTE(parentId, docId, query)}
              onSearch={() => {
                setShowDocumentActions(false);
                setToggleSearch(true);
                setToggleSearchAutoFocus(true);
              }}
              onClose={() => {
                setShowDocumentActions(false);
              }}
            />
          </Suspense>
        )}
        {toggleSearch && (
          <SearchActionsToolbar
            searchText={query || ''}
            setToggleSearch={setToggleSearch}
            toggleSearchAutoFocus={toggleSearchAutoFocus}
            onValue={val => {
              navigate(GET_VERSIONED_ROUTE(docVersion, docId, folder, val));
            }}
          />
        )}
      </IonHeader>

      <IonContent>
        {content && (
          <Suspense>
            <KiwimeriEditor
              id={docVersion}
              editable={false}
              enableToolbar={false}
              content={content}
              searchText={toggleSearch ? query : null}
            ></KiwimeriEditor>
          </Suspense>
        )}
      </IonContent>
      {versionData && <DocumentVersionFooter versionData={versionData} />}
    </>
  );
};
export default DocumentVersionViewer;
