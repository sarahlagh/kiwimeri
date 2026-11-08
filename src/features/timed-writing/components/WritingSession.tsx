import { GET_DOCUMENT_ROUTE } from '@/app/routes';
import { store } from '@/core/db/store';
import collectionService, {
  initialContent
} from '@/domain/collection/collection.service';
import { TimedSessionMode } from '@/domain/device-settings/device-settings';
import { deviceSettings } from '@/domain/device-settings/device-settings.service';
import { historyService } from '@/domain/history/history.service';
import useDeviceSetting from '@/shared/hooks/useDeviceSetting';
import { useIonModal } from '@ionic/react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import OngoingSession from './OngoingSession';
import SaveSessionModal, { SavePayload } from './SaveSessionModal';
import { StartPanel } from './StartPanel';

function saveTempDocument(payload: SavePayload) {
  if (payload.newItem) {
    collectionService.setUnsavedItemLexicalContent(
      payload.newItem,
      payload.content
    );
    const id = collectionService.saveItem(payload.newItem);
    return { id, parentId: payload.newItem.parentId };
  } else {
    collectionService.setItemLexicalContent(
      payload.existingItem!.id,
      payload.content,
      true // make it sync
    );
    historyService.addVersion(payload.existingItem!.id, true);
    return {
      id: payload.existingItem!.id,
      parentId: payload.existingItem!.parentId
    };
  }
}

const WritingSession = () => {
  const navigate = useNavigate();
  const tempDoc = store.getValue('tempDoc');
  const [ongoing, setOngoing] = useState<boolean>(tempDoc !== undefined);
  const duration = useDeviceSetting('defaultTimedDuration');
  const mode = useDeviceSetting('defaultTimedMode') as TimedSessionMode;

  const [present, dismiss] = useIonModal(SaveSessionModal, {
    onClose: (payload?: SavePayload) => {
      if (payload) {
        store.delValue('tempDoc');
        setOngoing(false);

        const { id, parentId } = saveTempDocument(payload);
        navigate(GET_DOCUMENT_ROUTE(parentId, id));
      }
      dismiss();
    }
  });

  if (!ongoing) {
    return (
      <StartPanel
        duration={duration}
        mode={mode}
        onStart={(d, m) => {
          deviceSettings.set('defaultTimedDuration', d);
          deviceSettings.set('defaultTimedMode', m);
          setOngoing(true);
        }}
      />
    );
  }

  return (
    <OngoingSession
      duration={duration * 60000}
      mode={mode}
      initValue={tempDoc || initialContent()}
      initHasEnded={tempDoc !== undefined}
      onEnd={content => {
        if (content) {
          // immediately save to temp value in tinybase, then on user choice, properly create doc
          store.setValue('tempDoc', content);
        } else {
          store.delValue('tempDoc');
          setOngoing(false);
        }
      }}
      onSave={content => {
        store.setValue('tempDoc', content);
        present({ cssClass: 'fixed-width-modal' }); // show "save somewhere" modal
      }}
    />
  );
};

export default WritingSession;
