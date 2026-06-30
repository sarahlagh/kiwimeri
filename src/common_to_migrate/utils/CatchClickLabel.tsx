import { IonLabel } from '@ionic/react';
import { ReactNode } from 'react';

type CatchClickLabelProps = {
  goalClicks: number;
  onFinalClick: () => void;
  maxTimeout?: number;
} & { readonly children?: ReactNode };

const CatchClickLabel = ({
  goalClicks,
  onFinalClick,
  maxTimeout = 3000,
  children
}: CatchClickLabelProps) => {
  let captureClicks = 0;
  let firstClickTs = 0;
  return (
    <IonLabel
      onClick={e => {
        if (captureClicks === 0) firstClickTs = e.timeStamp;
        if (e.timeStamp - firstClickTs >= maxTimeout) {
          captureClicks = 0;
          firstClickTs = 0;
        }
        if (captureClicks++ >= goalClicks) {
          onFinalClick();
          captureClicks = 0;
          firstClickTs = 0;
        }
      }}
    >
      {children}
    </IonLabel>
  );
};
export default CatchClickLabel;
