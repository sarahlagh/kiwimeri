import collectionService from '@/db/collection.service';
import { useHistory } from 'react-router-dom';
import { Id } from 'tinybase/with-schemas';
import DeleteButton from './DeleteButton';

type DeleteItemButtonProps = {
  id: Id;
  fallbackRoute: Id;
  onClose?: (role?: string, data?: unknown) => void;
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
          // history not available in modals and popovers
          history.replace(fallbackRoute);
        } else if (onClose) {
          onClose('delete', fallbackRoute);
        }
      }}
    ></DeleteButton>
  );
};
export default DeleteItemButton;
