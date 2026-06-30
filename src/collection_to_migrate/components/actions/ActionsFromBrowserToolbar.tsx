import DeleteItemButton from '@/common_to_migrate/buttons/DeleteItemButton';
import MoveFolderButton from '@/common_to_migrate/buttons/MoveFolderButton';
import QuickGroupButton from '@/common_to_migrate/buttons/QuickGroupButton';
import QuickUngroupButton from '@/common_to_migrate/buttons/QuickUngroupButton';
import RenameItemButton from '@/common_to_migrate/buttons/RenameItemButton';
import { GET_FOLDER_ROUTE } from '@/common_to_migrate/routes';
import collectionService from '@/db_to_migrate/collection.service';
import { resumeService } from '@/domain/collection/resume-state.service';
import { ExportItemsButton } from '@/features/import-export';
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
  const folder = resumeService.getCurrentFolder();
  const fallbackRoute = GET_FOLDER_ROUTE(folder);

  return (
    <IonToolbar color="medium" style={{ height: 56 + 'px' }}>
      <IonButtons slot="end">
        <RenameItemButton id={id} onClose={onClose} />
        <MoveFolderButton id={id} onClose={onClose} />
        <ExportItemsButton id={id} type={type} onClose={onClose} />
        <QuickGroupButton id={id} type={type} onClose={onClose} />
        <QuickUngroupButton id={id} type={type} onClose={onClose} />
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
