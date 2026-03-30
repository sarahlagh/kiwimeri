import { GET_DOCUMENT_ROUTE } from '@/common/routes';
import collectionService, { initialContent } from '@/db/collection.service';
import storageService from '@/db/storage.service';
import { useIonModal } from '@ionic/react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { useValue } from 'tinybase/ui-react';
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
    return { id, parent: payload.newItem.parent };
  } else {
    collectionService.setItemLexicalContent(
      payload.existingItem!.id,
      payload.content
    );
    return {
      id: payload.existingItem!.id,
      parent: payload.existingItem!.parent
    };
  }
}

const WritingSession = () => {
  const history = useHistory();
  const [ongoing, setOngoing] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(10); // in minutes

  const [present, dismiss] = useIonModal(SaveSessionModal, {
    onClose: (payload: SavePayload) => {
      if (payload) {
        storageService.getStore().delValue('tempDoc');
        setOngoing(false);

        const { id, parent } = saveTempDocument(payload);
        history.push(GET_DOCUMENT_ROUTE(parent, id));
      }
      dismiss();
    }
  });

  const tempDoc = useValue('tempDoc', 'store');
  useEffect(() => {
    if (tempDoc) {
      setOngoing(true);
    }
  }, [tempDoc]);

  if (!ongoing) {
    return (
      <StartPanel
        onStart={d => {
          setDuration(d);
          setOngoing(true);
        }}
      />
    );
  }

  return (
    <OngoingSession
      duration={duration * 60000}
      initValue={tempDoc?.toString() || initialContent()}
      onEnd={content => {
        if (content) {
          // immediately save to temp value in tinybase, then on user choice, properly create doc
          storageService.getStore().setValue('tempDoc', content);
        } else {
          storageService.getStore().delValue('tempDoc');
          setOngoing(false);
        }
        // TODO select old duration too
      }}
      onSave={content => {
        storageService.getStore().setValue('tempDoc', content);
        present(); // show "save somewhere" modal
      }}
    />
  );
};

export default WritingSession;
