import CloseDocumentButton from '@/common/buttons/CloseDocumentButton';
import ManageHistoryButton from '@/common/buttons/ManageHistoryButton';
import collectionService from '@/db/collection.service';
import { ExportItemsButton } from '@/features/import-export';
import { SearchButton } from '@/features/search';
import { IonButtons, IonToolbar } from '@ionic/react';

export type ActionsFromDocumentVersionViewerToolbarProps = {
  docId: string;
  onClose: (role?: string, data?: unknown) => void;
  onSearch: () => void;
  getBackRoute?: () => string;
};

const ActionsFromDocumentVersionViewerToolbar = ({
  docId,
  onClose,
  onSearch,
  getBackRoute
}: ActionsFromDocumentVersionViewerToolbarProps) => {
  const type = collectionService.getItemType(docId);

  return (
    <IonToolbar color="medium" style={{ height: 56 + 'px' }}>
      <IonButtons slot="end">
        <ExportItemsButton id={docId} type={type} onClose={onClose} />
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
