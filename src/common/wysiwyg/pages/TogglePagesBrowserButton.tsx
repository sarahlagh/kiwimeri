import { type JSX } from 'react';

import { IonButton, IonIcon } from '@ionic/react';
import { receiptOutline } from 'ionicons/icons';

import './KiwimeriPagesBrowserPlugin.scss';

export default function TogglePagesBrowserButton({
  onClick
}: {
  onClick: () => void;
}): JSX.Element {
  return (
    <IonButton
      className="toggle-pages-browser-btn"
      onClick={onClick}
      fill="clear"
    >
      <IonIcon icon={receiptOutline}></IonIcon>
    </IonButton>
  );
}
