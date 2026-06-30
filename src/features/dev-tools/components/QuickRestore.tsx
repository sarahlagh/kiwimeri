import { APPICONS } from '@/constants';
import { historyService } from '@/domain/history/history.service';
import { dateToStr } from '@/shared/misc/date-utils';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonItem,
  IonList
} from '@ionic/react';
import fetchLogsQuery from '../queries/fetchLogsQuery';

// quick win until trash/restore feature is done, to remove after
const QuickRestore = () => {
  const potentialLogs = fetchLogsQuery
    .getResults({})
    .filter(l => l.message.startsWith('deleting document,'));
  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>Restore deleted doc</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <IonList style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {potentialLogs.map(log => (
            <IonItem key={log.id}>
              {dateToStr('relative', log.ts)} &nbsp;
              {log.message}
              <IonButton
                slot="end"
                onClick={() => {
                  const [, id] = log.message.split(',');
                  const itemId = id.trim();
                  const latest = historyService.getLatestVersion(itemId);
                  if (latest) {
                    console.debug(
                      'restoring document from',
                      itemId,
                      latest.id,
                      latest.op
                    );
                    historyService.restoreDocumentVersion(itemId, latest.id);
                  }
                }}
              >
                <IonIcon icon={APPICONS.restore} />
              </IonButton>
            </IonItem>
          ))}
        </IonList>
      </IonCardContent>
    </IonCard>
  );
};

export default QuickRestore;
