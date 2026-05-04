import CloseDocumentButton from '@/common/buttons/CloseDocumentButton';
import ExportItemsButton from '@/common/buttons/ExportItemsButton';
import ManageHistoryButton from '@/common/buttons/ManageHistoryButton';
import SearchButton from '@/common/buttons/SearchButton';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import { IonButton, IonButtons, IonIcon, IonToolbar } from '@ionic/react';

export type ActionsFromDocumentVersionViewerToolbarProps = {
  id: string;
  docId: string;
  onClose: (role?: string, data?: unknown) => void;
  onSearch: () => void;
  getBackRoute?: () => string;
};

const ActionsFromDocumentVersionViewerToolbar = ({
  id,
  docId,
  onClose,
  onSearch,
  getBackRoute
}: ActionsFromDocumentVersionViewerToolbarProps) => {
  const type = collectionService.getItemType(id);

  return (
    <IonToolbar color="medium" style={{ height: 56 + 'px' }}>
      <IonButtons slot="end">
        <IonButton
          slot="end"
          fill="clear"
          onClick={() => onClose('pageBrowser')}
        >
          <IonIcon icon={APPICONS.page}></IonIcon>
        </IonButton>

        <ExportItemsButton id={id} type={type} onClose={onClose} />
        <ManageHistoryButton id={docId} />
        <SearchButton onSearch={onSearch} />
        <CloseDocumentButton
          id={docId}
          getRoute={getBackRoute}
          onClose={onClose}
        />
      </IonButtons>
    </IonToolbar>
  );
};
export default ActionsFromDocumentVersionViewerToolbar;
