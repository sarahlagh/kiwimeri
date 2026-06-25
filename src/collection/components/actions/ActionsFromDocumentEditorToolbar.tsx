import { CollectionItemType } from '@/collection/collection';
import CloseDocumentButton from '@/common/buttons/CloseDocumentButton';
import DeleteItemButton from '@/common/buttons/DeleteItemButton';
import ManageHistoryButton from '@/common/buttons/ManageHistoryButton';
import MoveFolderButton from '@/common/buttons/MoveFolderButton';
import QuickGroupButton from '@/common/buttons/QuickGroupButton';
import { GET_FOLDER_ROUTE } from '@/common/routes';
import { APPICONS } from '@/constants';
import { settingsService } from '@/domain/collection-settings/collection-settings.service';
import { resumeService } from '@/domain/resume-state/resume-state.service';
import { ViewAo3HtmlButton } from '@/features/ao3-html-ui';
import { ExportItemsButton } from '@/features/import-export';
import { SearchButton } from '@/features/search';
import { IonButton, IonButtons, IonIcon, IonToolbar } from '@ionic/react';

export type ActionsFromDocumentEditorToolbarProps = {
  docId: string;
  onClose: (role?: string, data?: unknown) => void;
  onSearch: () => void;
};

const ActionsFromDocumentEditorToolbar = ({
  docId,
  onClose,
  onSearch
}: ActionsFromDocumentEditorToolbarProps) => {
  const type = CollectionItemType.document;
  const folder = resumeService.getCurrentFolder();
  const fallbackRoute = GET_FOLDER_ROUTE(folder);

  const statsEnabled = settingsService.getNotebookDefaultStatsEnabled();
  const showStats = statsEnabled;

  return (
    <IonToolbar color="medium" style={{ height: 56 + 'px' }}>
      <IonButtons slot="end" style={{ overflowX: 'auto' }}>
        <MoveFolderButton id={docId} onClose={onClose} />
        <ExportItemsButton id={docId} type={type} onClose={onClose} />
        <ViewAo3HtmlButton id={docId} onClose={onClose} />
        <QuickGroupButton id={docId} type={type} onClose={onClose} />

        <DeleteItemButton
          id={docId}
          fallbackRoute={fallbackRoute}
          onClose={onClose}
        />

        <IonButton
          expand="block"
          onClick={() => {
            onClose('info', docId);
          }}
        >
          <IonIcon icon={APPICONS.info}></IonIcon>
        </IonButton>
        {showStats && (
          <IonButton
            expand="block"
            onClick={() => {
              onClose('stats', docId);
            }}
          >
            <IonIcon icon={APPICONS.stats}></IonIcon>
          </IonButton>
        )}

        <ManageHistoryButton
          id={docId}
          afterRestore={() => onClose('restore', docId)}
        />
        <SearchButton onSearch={onSearch} />
        <CloseDocumentButton id={docId} onClose={onClose} />
      </IonButtons>
    </IonToolbar>
  );
};
export default ActionsFromDocumentEditorToolbar;
