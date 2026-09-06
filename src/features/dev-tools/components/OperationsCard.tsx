import { getNativePersisters, space, store } from '@/core/db/store';
import { storageService } from '@/domain/space-merging/storage.service';
import GenericExportFileButton from '@/shared/buttons/GenericExportFileButton';
import GenericImportFileButton from '@/shared/buttons/GenericImportFileButton';
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

      <IonButtons style={{ overflowX: 'auto' }}>
        <IonButton
          fill="clear"
          onClick={() => {
            storageService.nukeStorage();
          }}
          color="danger"
        >
          nuke storage
        </IonButton>
        <IonButton
          fill="clear"
          onClick={() => {
            storageService.resetSpace();
          }}
          color="danger"
        >
          reset space
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
        <IonButton
          color={'danger'}
          onClick={async () => {
            console.debug('start loading native data');
            const {
              nativeStorePersister,
              nativeSpacePersister,
              nativeSpaceDocContentPersister,
              nativeSpaceArchivePersister
            } = getNativePersisters();
            await Promise.all([
              nativeStorePersister?.load(),
              nativeSpacePersister?.load(),
              nativeSpaceDocContentPersister?.load(),
              nativeSpaceArchivePersister?.load()
            ]).then(() => {
              console.debug('load native data done');
            });
          }}
        >
          LOAD NATIVE
        </IonButton>
      </IonButtons>
    </IonCard>
  );
};
export default OperationsCard;
