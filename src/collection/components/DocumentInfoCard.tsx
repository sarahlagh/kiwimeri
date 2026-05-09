import Loading from '@/app/components/Loading';
import AddTagsButton from '@/common/buttons/AddTagsButton';
import { dateToStr } from '@/common/date-utils';
import collectionService from '@/db/collection.service';
import userSettingsService from '@/db/user-settings.service';
import BottomSheet from '@/shared/containers/BottomSheet';
import {
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import { lazy, Suspense, useState } from 'react';
import WordCount from './WordCount';

export type DocInfoTab = 'general' | 'comments' | 'stats';

type DocumentInfoCardProps = {
  id: string;
  initialTab?: DocInfoTab;
};

const DocumentGeneralInfo = ({ id }: { id: string }) => {
  const item = collectionService.getItem(id);
  return (
    <IonList style={{ overflowY: 'auto' }}>
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
      <IonItem>
        <IonLabel>
          <Trans>Tags</Trans>
        </IonLabel>
        <AddTagsButton id={id} />
      </IonItem>
      <IonItem>
        <IonLabel>
          <Trans>Word count</Trans>
        </IonLabel>
        <WordCount id={id} />
      </IonItem>
    </IonList>
  );
};

const DocumentInfoCard = ({
  id,
  initialTab = 'general'
}: DocumentInfoCardProps) => {
  const [display, setDisplay] = useState<DocInfoTab>(initialTab);
  const statsEnabled = userSettingsService.getDefaultDisplayOpts().statsEnabled;
  const ChartContainer = lazy(
    () => import('@/features/stats-ui/components/ChartContainer')
  );

  return (
    <BottomSheet>
      {statsEnabled && (
        <IonSegment
          value={display}
          onIonChange={e => setDisplay(e.detail.value as DocInfoTab)}
        >
          <IonSegmentButton value="general">
            <IonLabel>
              <Trans>General</Trans>
            </IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="comments">
            <IonLabel>
              <Trans>Comments</Trans>
            </IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="stats">
            <IonLabel>
              <Trans>Stats</Trans>
            </IonLabel>
          </IonSegmentButton>
        </IonSegment>
      )}

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
