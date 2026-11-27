import { IonLabel } from '@ionic/react';
import { ReactNode, useRef } from 'react';

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
  const varRef = useRef({
    captureClicks: 0,
    firstClickTs: 0
  });
  return (
    <IonLabel
      onClick={e => {
        if (e.timeStamp - varRef.current.firstClickTs >= maxTimeout) {
          varRef.current.captureClicks = 0;
          varRef.current.firstClickTs = 0;
        }
        if (varRef.current.captureClicks === 0) {
          varRef.current.firstClickTs = e.timeStamp;
        }
        if (varRef.current.captureClicks++ >= goalClicks) {
          varRef.current.captureClicks = 0;
          varRef.current.firstClickTs = 0;
          onFinalClick();
        }
      }}
    >
      {children}
    </IonLabel>
  );
};
export default CatchClickLabel;
