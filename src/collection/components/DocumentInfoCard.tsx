import Loading from '@/app/components/Loading';
import BottomSheet from '@/common/containers/BottomSheet';
import { dateToStr } from '@/common/date-utils';
import collectionService from '@/db/collection.service';
import {
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import { lazy, Suspense, useState } from 'react';

type DocumentInfoCardProps = {
  id: string;
};

type Tab = 'general' | 'stats';

const DocumentGeneralInfo = ({ id }: { id: string }) => {
  const item = collectionService.getItem(id);
  return (
    <IonList>
      <IonItem>
        <IonLabel>
          <Trans>Created at</Trans>
        </IonLabel>
        <IonLabel slot="end" style={{ maxWidth: '160px', textAlign: 'end' }}>
          {dateToStr('relative', item.created)}
        </IonLabel>
      </IonItem>
      <IonItem>
        <IonLabel>
          <Trans>Updated at</Trans>
        </IonLabel>
        <IonLabel slot="end" style={{ maxWidth: '160px', textAlign: 'end' }}>
          {dateToStr('relative', item.updated)}
        </IonLabel>
      </IonItem>
    </IonList>
  );
};

const DocumentInfoCard = ({ id }: DocumentInfoCardProps) => {
  const [display, setDisplay] = useState<Tab>('stats');
  const ChartContainer = lazy(
    () => import('@/stats/components/ChartContainer')
  );

  return (
    <BottomSheet>
      <IonSegment
        value={display}
        onIonChange={e => setDisplay(e.detail.value as Tab)}
      >
        <IonSegmentButton value="general">
          <IonLabel>
            <Trans>General</Trans>
          </IonLabel>
        </IonSegmentButton>
        <IonSegmentButton value="stats">
          <IonLabel>
            <Trans>Stats</Trans>
          </IonLabel>
        </IonSegmentButton>
      </IonSegment>

      {display === 'general' && <DocumentGeneralInfo id={id} />}
      {display === 'stats' && (
        <Suspense fallback={<Loading />}>
          <ChartContainer id={id} />
        </Suspense>
      )}
    </BottomSheet>
  );
};

export default DocumentInfoCard;
