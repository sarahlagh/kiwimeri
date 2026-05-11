import { CollectionItemType } from '@/collection/collection';
import CloseDocumentButton from '@/common/buttons/CloseDocumentButton';
import DeleteItemButton from '@/common/buttons/DeleteItemButton';
import ExportItemsButton from '@/common/buttons/ExportItemsButton';
import ManageHistoryButton from '@/common/buttons/ManageHistoryButton';
import MoveFolderButton from '@/common/buttons/MoveFolderButton';
import QuickGroupButton from '@/common/buttons/QuickGroupButton';
import SearchButton from '@/common/buttons/SearchButton';
import { GET_DOCUMENT_ROUTE, GET_FOLDER_ROUTE } from '@/common/routes';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import navService from '@/db/nav.service';
import userSettingsService from '@/db/user-settings.service';
import {
  IonAlert,
  IonButton,
  IonButtons,
  IonIcon,
  IonToolbar
} from '@ionic/react';
import { hammerOutline } from 'ionicons/icons';

export type ActionsFromDocumentEditorToolbarProps = {
  id: string;
  docId: string;
  onClose: (role?: string, data?: unknown) => void;
  onSearch: () => void;
};

const ActionsFromDocumentEditorToolbar = ({
  id,
  docId,
  onClose,
  onSearch
}: ActionsFromDocumentEditorToolbarProps) => {
  const type = collectionService.getItemType(id);
  const showMoveFolder = type !== CollectionItemType.page;
  const showInfo = type !== CollectionItemType.page;

  const folder = navService.getCurrentFolder();
  const fallbackRoute =
    type !== CollectionItemType.page
      ? GET_FOLDER_ROUTE(folder)
      : GET_DOCUMENT_ROUTE(folder, docId);

  const hasPages =
    type === CollectionItemType.document &&
    collectionService.getDocumentPages(id).length > 0;

  const statsEnabled = userSettingsService.getDefaultDisplayOpts().statsEnabled;
  const showStats = statsEnabled && showInfo;
  return (
    <IonToolbar color="medium" style={{ height: 56 + 'px' }}>
      <IonButtons slot="end">
        {showMoveFolder && <MoveFolderButton id={id} onClose={onClose} />}
        <ExportItemsButton id={id} type={type} onClose={onClose} />
        <QuickGroupButton type={type} id={id} onClose={onClose} />

        {/** temp button to turn pages into documents */}
        {hasPages && (
          <>
            <IonButton id={`${id}-explode-doc-btn`}>
              <IonIcon icon={hammerOutline}></IonIcon>
            </IonButton>
            <IonAlert
              trigger={`${id}-explode-doc-btn`}
              message={`Choose how to convert your pages.`}
              inputs={[
                {
                  type: 'radio',
                  label: 'convert to documents 📄',
                  value: 'to-docs'
                },
                {
                  type: 'radio',
                  label: 'convert to comments 💬',
                  value: 'to-comments'
                }
              ]}
              buttons={[
                {
                  text: `Cancel`,
                  role: 'cancel'
                },
                {
                  text: `Confirm`,
                  role: 'confirm',
                  handler: value => {
                    if (value === 'to-docs') {
                      collectionService.explodeToDocuments(id, true);
                    } else if (value === 'to-comments') {
                      collectionService.explodeToComments(id);
                    }
                  }
                }
              ]}
            ></IonAlert>
          </>
        )}

        <DeleteItemButton
          id={id}
          fallbackRoute={fallbackRoute}
          onClose={onClose}
        />

        {showInfo && (
          <IonButton
            expand="block"
            onClick={() => {
              onClose('info', id);
            }}
          >
            <IonIcon icon={APPICONS.info}></IonIcon>
          </IonButton>
        )}
        {showStats && (
          <IonButton
            expand="block"
            onClick={() => {
              onClose('stats', id);
            }}
          >
            <IonIcon icon={APPICONS.stats}></IonIcon>
          </IonButton>
        )}

        <ManageHistoryButton
          id={docId}
          afterRestore={() => onClose('restore', id)}
        />
        <SearchButton onSearch={onSearch} />
        <CloseDocumentButton id={docId} onClose={onClose} />
      </IonButtons>
    </IonToolbar>
  );
};
export default ActionsFromDocumentEditorToolbar;
