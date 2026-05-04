import DeleteItemButton from '@/common/buttons/DeleteItemButton';
import ExportItemsButton from '@/common/buttons/ExportItemsButton';
import MoveFolderButton from '@/common/buttons/MoveFolderButton';
import RenameItemButton from '@/common/buttons/RenameItemButton';
import { GET_FOLDER_ROUTE } from '@/common/routes';
import collectionService from '@/db/collection.service';
import navService from '@/db/nav.service';
import { IonButtons, IonToolbar } from '@ionic/react';

export type ActionsFromBrowserToolbarProps = {
  id: string;
  onClose: (role?: string, data?: unknown) => void;
};

const ActionsFromBrowserToolbar = ({
  id,
  onClose
}: ActionsFromBrowserToolbarProps) => {
  const type = collectionService.getItemType(id);
  const folder = navService.getCurrentFolder();
  const fallbackRoute = GET_FOLDER_ROUTE(folder);

  return (
    <IonToolbar color="medium" style={{ height: 56 + 'px' }}>
      <IonButtons slot="end">
        <RenameItemButton id={id} onClose={onClose} />
        <MoveFolderButton id={id} onClose={onClose} />
        <ExportItemsButton id={id} type={type} onClose={onClose} />
        <DeleteItemButton
          id={id}
          fallbackRoute={fallbackRoute}
          onClose={onClose}
        />
      </IonButtons>
    </IonToolbar>
  );
};
export default ActionsFromBrowserToolbar;
