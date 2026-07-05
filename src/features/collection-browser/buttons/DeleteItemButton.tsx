import collectionService from '@/domain/collection/collection.service';
import DeleteButton from '@/shared/buttons/DeleteButton';
import { useNavigate } from 'react-router';
import { Id } from 'tinybase/with-schemas';

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
  const navigate = useNavigate();
  return (
    <DeleteButton
      trigger="open-modal-delete-item"
      onClose={onClose}
      onConfirm={() => {
        collectionService.deleteItem(id);
        if (history) {
          // history not available in modals and popovers
          navigate(fallbackRoute);
        } else if (onClose) {
          onClose('delete', fallbackRoute);
        }
      }}
    ></DeleteButton>
  );
};
export default DeleteItemButton;
