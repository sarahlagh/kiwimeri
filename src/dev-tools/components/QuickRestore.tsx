import { dateToStr } from '@/common/utils';
import { APPICONS } from '@/constants';
import { historyService } from '@/db/collection-history.service';
import { appLog } from '@/log';
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

// quick win until trash/restore feature is done, to remove after
const QuickRestore = () => {
  const potentialLogs = appLog
    .getLogs()
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
