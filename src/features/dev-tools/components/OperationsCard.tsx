import GenericExportFileButton from '@/common/buttons/GenericExportFileButton';
import GenericImportFileButton from '@/common/buttons/GenericImportFileButton';
import { space, store } from '@/core/db/store';
import storageService from '@/db/storage.service';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardTitle
} from '@ionic/react';

const OperationsCard = () => {
  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>Operations</IonCardTitle>
      </IonCardHeader>

      <IonButtons>
        <IonButton
          fill="clear"
          onClick={() => {
            store.setContent([{}, {}]);
          }}
          color="danger"
        >
          nuke store
        </IonButton>
        <IonButton
          fill="clear"
          onClick={() => {
            storageService.nukeSpace();
          }}
          color="danger"
        >
          nuke space
        </IonButton>
        <GenericExportFileButton
          fill="clear"
          color={'primary'}
          label={`Export space`}
          icon={null}
          getFileMime={'application/json'}
          getFileTitle={() => 'full-space-backup.json'}
          getFileContent={async () => {
            return JSON.stringify(space.getContent());
          }}
        />
        <GenericImportFileButton
          label={`Import space`}
          color={'danger'}
          icon={null}
          onContentRead={async (content: ArrayBuffer) => {
            const textContent = new TextDecoder().decode(content);
            space.setContent(JSON.parse(textContent));
            return { confirm: true };
          }}
        />
        <GenericExportFileButton
          fill="clear"
          color={'primary'}
          label={`Export store`}
          icon={null}
          getFileMime={'application/json'}
          getFileTitle={() => 'full-store-backup.json'}
          getFileContent={async () => {
            return JSON.stringify(store.getContent());
          }}
        />
        <GenericImportFileButton
          label={`Import store`}
          color={'danger'}
          icon={null}
          onContentRead={async (content: ArrayBuffer) => {
            const textContent = new TextDecoder().decode(content);
            store.setContent(JSON.parse(textContent));
            return { confirm: true };
          }}
        />
      </IonButtons>
    </IonCard>
  );
};
export default OperationsCard;
