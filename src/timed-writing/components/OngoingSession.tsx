import KiwimeriEditor from '@/common/wysiwyg/lexical/KiwimeriEditor';
import { APPICONS } from '@/constants';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonIcon,
  IonLabel,
  IonProgressBar,
  IonToolbar
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import {
  EditorState,
  SerializedEditorState,
  SerializedLexicalNode
} from 'lexical';
import { useEffect, useRef, useState } from 'react';
import KeystrokeListenerPlugin from './KeystrokeListenerPlugin';

import { countWords } from '@/common/utils';
import formatConverter from '@/format-conversion/format-converter.service';
import './OngoingSession.scss';

const WARN_TIME = 2000;
const MAX_IDLE = WARN_TIME + 3000;

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

const OngoingSession = ({
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
  const [warnClass, setWarnClass] = useState<string>('');
  const [wordCount, setWordCount] = useState(0);

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
    setWarnClass('');
    if (now - startedAt > duration) {
      return 'success';
    }
    if (idle > WARN_TIME && idle < MAX_IDLE) {
      setColor('danger');
      setWarnClass(`warn${Math.ceil((MAX_IDLE - idle) / 1000)}`);
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
          const lex = JSON.stringify(editorState.toJSON());
          onEnd(lex);
          setWordCount(countWords(formatConverter.toPlainText(lex)));
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
          additionalClassNames={'timed-writing ' + warnClass}
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
                setWordCount(
                  countWords(
                    formatConverter.toPlainText(
                      JSON.stringify(editorState.toJSON())
                    )
                  )
                );
              }
            }}
          />
        </KiwimeriEditor>
      </IonContent>

      <IonFooter>
        <IonToolbar color={color}>
          {endedAt && (
            <IonLabel style={{ paddingLeft: '10px' }}>
              <Trans>{wordCount} words</Trans>
            </IonLabel>
          )}
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

export default OngoingSession;
