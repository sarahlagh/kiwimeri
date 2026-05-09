import AddTagsButton from '@/common/buttons/AddTagsButton';
import { dateToStr } from '@/common/date-utils';
import collectionService from '@/db/collection.service';
import { IonItem, IonLabel, IonList } from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import WordCount from '../WordCount';

type DocumentInfoCardProps = {
  id: string;
};

const DocumentGeneralInfo = ({ id }: DocumentInfoCardProps) => {
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

export default DocumentGeneralInfo;
