import { IonToolbar } from '@ionic/react';
import { ReactNode } from 'react';

export type TemplateActionsToolbarProps = {
  rows?: number;
} & { readonly children?: ReactNode };

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
