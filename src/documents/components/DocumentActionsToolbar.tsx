import CommonActionsToolbar, {
  CommonActionsToolbarProps
} from './CommonActionsToolbar';

type DocumentActionsToolbarProps = {
  id: string;
} & CommonActionsToolbarProps;

const DocumentActionsToolbar = ({
  id,
  rows,
  onClose
}: DocumentActionsToolbarProps) => {
  return (
    <CommonActionsToolbar
      id={id}
      rows={rows}
      onClose={onClose}
    ></CommonActionsToolbar>
  );
};
export default DocumentActionsToolbar;
