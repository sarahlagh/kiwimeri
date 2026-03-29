import { dateToStr } from '@/common/utils';
import KiwimeriEditor from '@/common/wysiwyg/lexical/KiwimeriEditor';
import { APPICONS } from '@/constants';
import collectionService, { initialContent } from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import storageService from '@/db/storage.service';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonFooter,
  IonIcon,
  IonItem,
  IonProgressBar,
  IonRadio,
  IonRadioGroup,
  IonToolbar
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import {
  EditorState,
  SerializedEditorState,
  SerializedLexicalNode
} from 'lexical';
import { useEffect, useRef, useState } from 'react';
import { useValue } from 'tinybase/ui-react';
import KeystrokeListenerPlugin from './KeystrokeListenerPlugin';

const WARN_TIME = 3000;
const MAX_IDLE = WARN_TIME + 2000;

const StartPanel = ({ onStart }: { onStart: (duration: number) => void }) => {
  const [duration, setDuration] = useState<number>(10);
  const options = [5, 10, 15, 20];
  // TODO allow custom time
  return (
    <IonContent>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>
            <Trans>Choose a session length</Trans>
          </IonCardTitle>
          <IonCardSubtitle>
            <Trans>
              This feature is inspired by Squibler&apos;s Most Dangerous Writing
              App (https://www.squibler.io/dangerous-writing-prompt-app). Choose
              a length for your writing session. Once you start, you must keep
              writing or all progress will be lost. You will have the option to
              save your work in a new document in your collection once you
              finish.
            </Trans>
          </IonCardSubtitle>
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

          <IonFooter>
            <IonButton onClick={() => onStart(duration)}>
              <Trans>Start Writing</Trans>
            </IonButton>
          </IonFooter>
        </IonCardContent>
      </IonCard>
    </IonContent>
  );
};

const ClockTicking = ({
  startedAt,
  duration,
  color
}: {
  startedAt: number;
  duration: number;
  color?: string;
}) => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((Date.now() - startedAt) / duration);
    }, 1000);
    return () => {
      console.debug('clear ticking clock');
      clearInterval(interval);
    };
  }, [startedAt]);

  return <IonProgressBar color={color} value={progress} />;
};

const OngoingWritePanel = ({
  duration,
  initValue,
  onEnd,
  onSave
}: {
  duration: number;
  initValue: string;
  onEnd: (content?: string) => void;
  onSave: (content: SerializedEditorState<SerializedLexicalNode>) => void;
}) => {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [endedAt, setEndedAt] = useState<number | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const refWriter = useRef(null);
  const [color, setColor] = useState<string | undefined>(undefined);

  const onClickedAnywhere: React.MouseEventHandler<HTMLIonContentElement> = (
    event: React.MouseEvent<HTMLIonContentElement, MouseEvent>
  ) => {
    const target = event.target as HTMLIonContentElement;
    // exclude text area & toolbar from this handler
    // focus the text editor when clicking on empty ion-content
    if (
      refWriter.current &&
      target.role === 'main' &&
      target.localName === 'ion-content'
    ) {
      const ref = refWriter.current as HTMLBaseElement;
      ref.focus();
    }
  };

  const onNextTick = () => {
    if (startedAt === null || updatedAt === null) return;
    const now = Date.now();
    const idle = now - updatedAt;
    console.debug('next tick', (now - startedAt) / 1000, idle / 1000);
    setColor(undefined);
    if (now - startedAt > duration) {
      return 'success';
    }
    if (idle > WARN_TIME && idle < MAX_IDLE) {
      setColor('danger');
    }
    if (idle > MAX_IDLE) {
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
      <IonContent onClick={onClickedAnywhere}>
        {startedAt && !endedAt && (
          <ClockTicking
            startedAt={startedAt}
            duration={duration}
            color={color}
          />
        )}
        <KiwimeriEditor
          ref={refWriter}
          content={initValue}
          enableToolbar={false}
          enableDebugTreeView={false}
        >
          <KeystrokeListenerPlugin
            onWritingKey={editorState => {
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
        </KiwimeriEditor>
      </IonContent>

      <IonFooter>
        <IonToolbar color={color}>
          <IonButtons slot="end">
            {endedAt && (
              <IonButton
                onClick={() => {
                  const content = editorState?.toJSON();
                  if (content) {
                    onSave(content);
                  }
                  onEnd(); // delete temp doc
                }}
              >
                <Trans>Save your work</Trans>
                <IonIcon icon={APPICONS.save}></IonIcon>
              </IonButton>
            )}
            <IonButton onClick={() => onEnd()}>
              <Trans>Discard</Trans>
              <IonIcon icon={APPICONS.deleteAction}></IonIcon>
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonFooter>
    </>
  );
};

const DangerousMode = () => {
  const { t } = useLingui();
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
        const notebook = notebooksService.getCurrentNotebook();
        const { item } = collectionService.getNewDocumentObj(notebook);
        item.title = t`temp session ` + dateToStr('iso');
        collectionService.setUnsavedItemLexicalContent(item, content);
        collectionService.saveItem(item);
        // TODO redirect to document
      }}
    />
  );
};

export default DangerousMode;
