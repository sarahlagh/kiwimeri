import { useSearchQuery } from '@/app/context/RouteContext';
import { GET_DOCUMENT_ROUTE, GET_VERSIONED_ROUTE } from '@/app/routes';
import { APPICONS } from '@/constants';
import { CollectionItemSnapshotData } from '@/domain/collection/collection';
import collectionService from '@/domain/collection/collection.service';
import { unminimizeContentFromStorage } from '@/domain/collection/compress-file-content';
import { RichTextEditor } from '@/features/rich-text-editor';
import { SearchActionsToolbar } from '@/features/search';
import { noop } from '@/shared/utils';
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
import { lazy, Suspense, useState } from 'react';
import { useNavigate } from 'react-router';
import useVersion from '../hooks/useVersion';

const ActionsFromDocumentVersionViewerToolbar = lazy(() =>
  import('@/features/collection-item-actions').then(m => ({
    default: m.ActionsFromDocumentVersionViewerToolbar
  }))
);

interface DocumentVersionViewerProps {
  docId: string;
  docVersion: string;
  showActions?: boolean;
  setShowActions?: (showActions: boolean) => void;
  folder: string;
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

const PrivateDocumentVersionViewer = ({
  docId,
  docVersion,
  showActions = false,
  setShowActions = noop,
  folder
}: DocumentVersionViewerProps) => {
  const navigate = useNavigate();
  const [toggleSearch, setToggleSearch] = useState(false);
  const [toggleSearchAutoFocus, setToggleSearchAutoFocus] = useState(true);
  const query = useSearchQuery() || '';

  const versionedDoc = useVersion(docVersion);
  const content = versionedDoc?.content
    ? unminimizeContentFromStorage(versionedDoc.content)
    : undefined;
  const versionData = versionedDoc?.snapshotJson;
  const documentTitle = versionData?.title;
  const parentId = collectionService.getItemParent(docId);

  return (
    <>
      <IonHeader>
        {/*only visible in non compact mode*/}
        <IonToolbar className="ion-hide-md-down" color="tertiary">
          <IonTitle>
            <IonLabel>{documentTitle}</IonLabel>
          </IonTitle>
          <IonButton
            slot="end"
            fill="clear"
            color={'dark'}
            onClick={() => {
              setShowActions(!showActions);
              setToggleSearch(false);
            }}
          >
            <IonIcon icon={APPICONS.itemActions}></IonIcon>
          </IonButton>
        </IonToolbar>
        {showActions && (
          <Suspense>
            <ActionsFromDocumentVersionViewerToolbar
              docId={docId}
              getBackRoute={() => GET_DOCUMENT_ROUTE(parentId, docId, query)}
              onSearch={() => {
                setShowActions(false);
                setToggleSearch(true);
                setToggleSearchAutoFocus(true);
              }}
              onClose={() => {
                setShowActions(false);
              }}
            />
          </Suspense>
        )}
        {toggleSearch && (
          <SearchActionsToolbar
            searchText={query}
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
          <RichTextEditor
            instanceType="DocumentVersionViewer"
            historyId={docVersion}
            editable={false}
            enableToolbar={false}
            enableHistory={false}
            enableOnChange={false}
            initialState={content}
            searchText={query}
          />
        )}
      </IonContent>
      {versionData && <DocumentVersionFooter versionData={versionData} />}
    </>
  );
};

const DocumentVersionViewer = (props: DocumentVersionViewerProps) => {
  return <PrivateDocumentVersionViewer key={props.docVersion} {...props} />;
};
export default DocumentVersionViewer;
