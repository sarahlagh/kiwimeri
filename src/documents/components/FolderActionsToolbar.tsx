import CommonActionsToolbar, {
  CommonActionsToolbarProps
} from './CommonActionsToolbar';

type FolderActionsToolbarProps = {
  id: string;
} & CommonActionsToolbarProps;

const FolderActionsToolbar = ({
  id,
  rows,
  onClose
}: FolderActionsToolbarProps) => {
  return (
    <CommonActionsToolbar
      id={id}
      rows={rows}
      onClose={onClose}
    ></CommonActionsToolbar>
  );
};
export default FolderActionsToolbar;
