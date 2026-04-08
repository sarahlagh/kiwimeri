import { IonCard, IonCardContent, IonIcon } from '@ionic/react';
import { ReactNode, useState } from 'react';

import { APPICONS } from '@/constants';
import './BottomSheet.scss';

type BottomSheetProps = { readonly children?: ReactNode };

const snaps = [45, 100];
const nextSnap = (i: number) => (i < snaps.length - 1 ? i + 1 : 0);

const BottomSheet = ({ children }: BottomSheetProps) => {
  const [snap, setSnap] = useState<number>(0);

  return (
    <div style={{ height: `${snaps[snap]}%` }}>
      <IonCard className={'bottom-sheet-card'}>
        <div
          className="expand-bar"
          onClick={() => {
            setSnap(nextSnap(snap));
          }}
        >
          <IonIcon
            icon={
              snaps[snap] === 100 ? APPICONS.collapseCard : APPICONS.expandCard
            }
          ></IonIcon>
        </div>
        <IonCardContent>{children}</IonCardContent>
      </IonCard>
    </div>
  );
};

export default BottomSheet;
