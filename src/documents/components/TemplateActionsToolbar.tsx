import { IonToolbar } from '@ionic/react';

export type TemplateActionsToolbarProps = {
  rows?: number;
  onClose?: (confirmed: boolean) => void;
} & React.HTMLAttributes<HTMLIonToolbarElement>;

const TemplateActionsToolbar = ({
  rows = 1,
  children
}: TemplateActionsToolbarProps) => {
  return (
    <IonToolbar color="medium" style={{ height: rows * 56 + 'px' }}>
      {children}
    </IonToolbar>
  );
};
export default TemplateActionsToolbar;
