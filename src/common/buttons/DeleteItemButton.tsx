import { GET_FOLDER_ROUTE } from '@/common/routes';
import collectionService from '@/db/collection.service';
import userSettingsService from '@/db/user-settings.service';
import { useHistory } from 'react-router-dom';
import { Id } from 'tinybase/with-schemas';
import DeleteButton from './DeleteButton';

type DeleteItemButtonProps = {
  id: Id;
  onClose?: (role?: string) => void;
};

const DeleteItemButton = ({ id, onClose }: DeleteItemButtonProps) => {
  const history = useHistory();
  return (
    <DeleteButton
      trigger="open-modal-delete-item"
      onClose={onClose}
      onConfirm={() => {
        collectionService.deleteItem(id);
        if (history) {
          history.replace(
            GET_FOLDER_ROUTE(userSettingsService.getCurrentFolder())
          );
        }
      }}
    ></DeleteButton>
  );
};
export default DeleteItemButton;
