import collectionService from '@/db/collection.service';
import { useHistory } from 'react-router-dom';
import { Id } from 'tinybase/with-schemas';
import DeleteButton from './DeleteButton';

type DeleteItemButtonProps = {
  id: Id;
  fallbackRoute: Id;
  onClose?: (role?: string) => void;
};

const DeleteItemButton = ({
  id,
  fallbackRoute,
  onClose
}: DeleteItemButtonProps) => {
  const history = useHistory();
  return (
    <DeleteButton
      trigger="open-modal-delete-item"
      onClose={onClose}
      onConfirm={() => {
        collectionService.deleteItem(id);
        if (history) {
          history.replace(fallbackRoute);
        }
      }}
    ></DeleteButton>
  );
};
export default DeleteItemButton;
