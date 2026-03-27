import { dateToStr } from '@/common/utils';
import KiwimeriEditor from '@/common/wysiwyg/lexical/KiwimeriEditor';
import { initialContent } from '@/db/collection.service';
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
import { Trans } from '@lingui/react/macro';
import { EditorState } from 'lexical';
import { useEffect, useState } from 'react';

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
  onEnd
}: {
  duration: number;
  onEnd: (end: number, content?: string) => void;
}) => {
  const maxDuration = 15000; // duration * 60000; // in minutes
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [endedAt, setEndedAt] = useState<number | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);

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
          onEnd(now, JSON.stringify(editorState.toJSON()));
        } else {
          onEnd(now);
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
      <IonButton onClick={() => onEnd(Date.now())}>reset</IonButton>
      {endedAt && (
        <IonButton
          onClick={() => {
            // TODO here transform content into real document
            // and delete temp doc
            console.debug('save', editorState?.toJSON());
          }}
        >
          save
        </IonButton>
      )}
      <KiwimeriEditor
        content={initialContent()}
        enableToolbar={false}
        onChange={editorState => {
          setEditorState(editorState);
          if (!endedAt) {
            setUpdatedAt(Date.now());
            if (!startedAt) {
              setStartedAt(Date.now());
            }
          }
        }}
      />
    </>
  );
};

const DangerousMode = () => {
  const [ongoing, setOngoing] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(10); // in minutes

  // TODO check temp value if previous session had unsaved work

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
      onEnd={(endTs, content) => {
        console.log('finished', endTs, content);
        // TODO redirect to last opened doc, save
        if (!content) setOngoing(false);
        // TODO immediately save to temp value in tinybase, then on user choice, properly create doc
        // TODO select old duration too
      }}
    />
  );
};

export default DangerousMode;
