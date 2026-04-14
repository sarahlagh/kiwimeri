import BottomSheet from '@/common/containers/BottomSheet';
import { dateToStr } from '@/common/date-utils';
import collectionService from '@/db/collection.service';
import ChartContainer from '@/stats/components/ChartContainer';
import {
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import { CollectionItem } from '../collection';

type DocumentInfoCardProps = {
  id: string;
};

type Tab = 'general' | 'stats';

const DocumentGeneralInfo = ({ item }: { item: CollectionItem }) => {
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
  const item = collectionService.getItem(id);

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

      {display === 'general' && <DocumentGeneralInfo item={item} />}
      {display === 'stats' && <ChartContainer id={id} />}
    </BottomSheet>
  );
};

export default DocumentInfoCard;
