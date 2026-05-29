import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonIcon
} from '@ionic/react';
import { ReactNode, useState } from 'react';

import { APPICONS } from '@/constants';
import './BottomSheet.scss';

type BottomSheetProps = {
  onCloseSelf?: () => void;
  readonly header?: ReactNode;
} & {
  readonly children?: ReactNode;
};

const snaps = [45, 100];
const nextSnap = (i: number) => (i < snaps.length - 1 ? i + 1 : 0);

const BottomSheet = ({ onCloseSelf, header, children }: BottomSheetProps) => {
  const [snap, setSnap] = useState<number>(0);

  return (
    <div style={{ height: `${snaps[snap]}%` }}>
      <IonCard className={'bottom-sheet-card'}>
        <div className="bottom-sheet-top-bar">
          <IonButtons
            className="expand-bar"
            onClick={() => {
              setSnap(nextSnap(snap));
            }}
          >
            <IonButton>
              <IonIcon
                icon={
                  snaps[snap] === 100
                    ? APPICONS.collapseCard
                    : APPICONS.expandCard
                }
              />
            </IonButton>
          </IonButtons>

          <IonButtons>
            <IonButton onClick={onCloseSelf}>
              <IonIcon icon={APPICONS.closeAction} />
            </IonButton>
          </IonButtons>
        </div>
        {header}
        <IonCardContent>{children}</IonCardContent>
      </IonCard>
    </div>
  );
};

export default BottomSheet;
