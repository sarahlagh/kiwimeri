import { GET_DOCUMENT_ROUTE } from '@/common/routes';
import { store } from '@/core/db/store';
import { SID } from '@/core/db/store-constants';
import { useStoreValue } from '@/core/db/tinybase-hooks';
import collectionService, { initialContent } from '@/db/collection.service';
import { historyService } from '@/domain/collection-history/collection-history.service';
import { deviceSettings } from '@/domain/device-settings/device-settings.service';
import useDeviceSetting from '@/domain/device-settings/hooks/useDeviceSetting';
import { useIonModal } from '@ionic/react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { SessionMode } from '../mode';
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
    return { id, parent: payload.newItem.parentId };
  } else {
    collectionService.setItemLexicalContent(
      payload.existingItem!.id,
      payload.content,
      true // make it sync
    );
    historyService.addVersion(payload.existingItem!.id, true);
    return {
      id: payload.existingItem!.id,
      parent: payload.existingItem!.parentId
    };
  }
}

const WritingSession = () => {
  const history = useHistory();
  const [ongoing, setOngoing] = useState<boolean>(false);
  const duration = useDeviceSetting('defaultTimedDuration');
  const mode = useDeviceSetting('defaultTimedMode') as SessionMode;
  const tempDoc = useStoreValue('tempDoc', SID.store);

  const [present, dismiss] = useIonModal(SaveSessionModal, {
    onClose: (payload: SavePayload) => {
      if (payload) {
        store.delValue('tempDoc');
        setOngoing(false);

        const { id, parent } = saveTempDocument(payload);
        history.push(GET_DOCUMENT_ROUTE(parent, id));
      }
      dismiss();
    }
  });

  useEffect(() => {
    if (tempDoc) {
      setOngoing(true);
    }
  }, [tempDoc]);

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
      initValue={tempDoc?.toString() || initialContent()}
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
