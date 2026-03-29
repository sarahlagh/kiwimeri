import { GET_DOCUMENT_ROUTE } from '@/common/routes';
import { dateToStr } from '@/common/utils';
import collectionService, { initialContent } from '@/db/collection.service';
import navService from '@/db/nav.service';
import storageService from '@/db/storage.service';
import { useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { useValue } from 'tinybase/ui-react';
import OngoingSession from './OngoingSession';
import { StartPanel } from './StartPanel';

const WritingSession = () => {
  const { t } = useLingui();
  const history = useHistory();
  const [ongoing, setOngoing] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(10); // in minutes

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
        // here transform content into real document
        const parent = navService.getCurrentFolder();
        const { item } = collectionService.getNewDocumentObj(parent);
        item.title = t`timed session ` + dateToStr('iso');
        collectionService.setUnsavedItemLexicalContent(item, content);
        const id = collectionService.saveItem(item);
        // redirect to document
        history.push(GET_DOCUMENT_ROUTE(parent, id));
      }}
    />
  );
};

export default WritingSession;
