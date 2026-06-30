import AddTagsButton from '@/common_to_migrate/buttons/AddTagsButton';
import { dateToStr } from '@/common_to_migrate/date-utils';
import collectionService from '@/db_to_migrate/collection.service';
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
          {dateToStr('relative', item.createdAt)}
        </IonLabel>
      </IonItem>
      <IonItem>
        <IonLabel>
          <Trans>Updated at</Trans>
        </IonLabel>
        <IonLabel slot="end" style={{ maxWidth: '160px', textAlign: 'end' }}>
          {dateToStr('relative', item.updatedAt)}
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
