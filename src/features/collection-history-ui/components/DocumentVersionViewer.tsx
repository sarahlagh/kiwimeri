import { GET_DOCUMENT_ROUTE, GET_VERSIONED_ROUTE } from '@/app/routes';
import KiwimeriEditor from '@/common_to_migrate/wysiwyg/lexical/KiwimeriEditor';
import { APPICONS } from '@/constants';
import collectionService from '@/db_to_migrate/collection.service';
import { CollectionItemSnapshotData } from '@/domain/collection/collection';
import { ActionsFromDocumentVersionViewerToolbar } from '@/features/collection-ui';
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
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import useVersion from '../hooks/useVersion';

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
  const history = useHistory();
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
        )}
        {toggleSearch && (
          <SearchActionsToolbar
            searchText={query || ''}
            setToggleSearch={setToggleSearch}
            toggleSearchAutoFocus={toggleSearchAutoFocus}
            onValue={val => {
              history.push(GET_VERSIONED_ROUTE(docVersion, docId, folder, val));
            }}
          />
        )}
      </IonHeader>

      <IonContent>
        {content && (
          <KiwimeriEditor
            id={docVersion}
            editable={false}
            enableToolbar={false}
            content={content}
            searchText={toggleSearch ? query : null}
          ></KiwimeriEditor>
        )}
      </IonContent>
      {versionData && <DocumentVersionFooter versionData={versionData} />}
    </>
  );
};
export default DocumentVersionViewer;
