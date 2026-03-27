import { dateToStr } from '@/common/utils';
import KiwimeriEditor from '@/common/wysiwyg/lexical/KiwimeriEditor';
import collectionService, { initialContent } from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import storageService from '@/db/storage.service';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonRadio,
  IonRadioGroup
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { EditorState } from 'lexical';
import { useEffect, useState } from 'react';
import { useValue } from 'tinybase/ui-react';

const StartPanel = ({ onStart }: { onStart: (duration: number) => void }) => {
  const [duration, setDuration] = useState<number>(10);
  const options = [5, 10, 15, 20];
  // TODO allow custom time
  // TODO display help
  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>
          <Trans>Start</Trans>
        </IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <IonRadioGroup
          value={duration}
          onIonChange={e => {
            setDuration(e.detail.value);
          }}
        >
          {options.map(v => (
            <IonItem key={v}>
              <IonRadio value={v}>
                <Trans>{v} minutes</Trans>
              </IonRadio>
            </IonItem>
          ))}
        </IonRadioGroup>

        <IonButton onClick={() => onStart(duration)}>
          <Trans>Start Writing</Trans>
        </IonButton>
      </IonCardContent>
    </IonCard>
  );
};

const ClockTicking = ({ startedAt }: { startedAt: number }) => {
  const [dateStr, setDateStr] = useState('');
  useEffect(() => {
    const interval = setInterval(() => {
      setDateStr(dateToStr('relative', startedAt));
    }, 1000);
    return () => {
      console.debug('clear ticking clock');
      clearInterval(interval);
    };
  }, [startedAt]);
  return <p>started {dateStr}</p>;
};

const WARN_TIME = 5000;
const MAX_IDLE = WARN_TIME + 3000;

const OngoingWritePanel = ({
  duration,
  initValue,
  onEnd
}: {
  duration: number;
  initValue: string;
  onEnd: (content?: string) => void;
}) => {
  const maxDuration = 15000; // duration * 60000; // in minutes
  const { t } = useLingui();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [endedAt, setEndedAt] = useState<number | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  console.debug('endedAt', endedAt, 'startedAt', startedAt);

  const onNextTick = () => {
    if (startedAt === null || updatedAt === null) return;
    const now = Date.now();
    const idle = now - updatedAt;
    // console.debug('next tick', (now - startedAt) / 1000, idle / 1000);
    if (now - startedAt > maxDuration) {
      console.log('success');
      return 'success';
    }
    if (idle > WARN_TIME && idle < MAX_IDLE) {
      console.warn('keep writing!!!!!');
    }
    if (idle > MAX_IDLE) {
      console.warn('you lost');
      return 'fail';
    }
    return 'continue';
  };
  useEffect(() => {
    if (endedAt !== null || startedAt === null) return;
    const nextTick = (clearTimer = true) => {
      const status = onNextTick();
      if (status !== 'continue') {
        if (clearTimer) clearInterval(timeout);
        const now = Date.now();
        setEndedAt(now);
        if (status === 'success' && editorState) {
          onEnd(JSON.stringify(editorState.toJSON()));
        } else {
          onEnd();
        }
      }
    };
    nextTick(false);
    const timeout = setInterval(() => {
      nextTick();
    }, 1000);
    return () => {
      clearInterval(timeout);
    };
  }, [updatedAt]);

  return (
    <>
      {startedAt && !endedAt && <ClockTicking startedAt={startedAt} />}
      for
      {duration} minutes
      <IonButton onClick={() => onEnd()}>reset</IonButton>
      {endedAt && (
        <IonButton
          onClick={() => {
            // here transform content into real document
            const content = editorState?.toJSON();
            if (content) {
              const notebook = notebooksService.getCurrentNotebook();
              const { item } = collectionService.getNewDocumentObj(notebook);
              item.title = t`temp session ` + dateToStr('iso');
              collectionService.setUnsavedItemLexicalContent(item, content);
              collectionService.saveItem(item);
              // TODO redirect to document
            }
            onEnd(); // delete temp doc
          }}
        >
          save
        </IonButton>
      )}
      <KiwimeriEditor
        content={initValue}
        enableToolbar={false}
        onChange={editorState => {
          // TODO don't count backspace
          setEditorState(editorState);
          if (!endedAt) {
            setUpdatedAt(Date.now());
            if (!startedAt) {
              setStartedAt(Date.now());
            }
          } else {
            onEnd(JSON.stringify(editorState.toJSON()));
          }
        }}
      />
    </>
  );
};

const DangerousMode = () => {
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
    <OngoingWritePanel
      duration={duration}
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
    />
  );
};

export default DangerousMode;
