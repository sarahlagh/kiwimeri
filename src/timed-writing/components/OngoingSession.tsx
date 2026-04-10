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
import { EditorState } from 'lexical';
import { useEffect, useState } from 'react';
import KeystrokeListenerPlugin from './KeystrokeListenerPlugin';

import { countWords } from '@/common/utils';
import formatConverter from '@/format-conversion/format-converter.service';
import { SessionMode } from '../mode';
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
      clearInterval(interval);
    };
  }, [startedAt]);

  return <IonProgressBar color={color} value={progress} />;
};

const OngoingSession = ({
  duration,
  mode,
  initValue,
  onEnd,
  onSave
}: {
  duration: number;
  mode: SessionMode;
  initValue: string;
  onEnd: (content?: string) => void;
  onSave: (content: string) => void;
}) => {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [endedAt, setEndedAt] = useState<number | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [color, setColor] = useState<string | undefined>(undefined);
  const [warnClass, setWarnClass] = useState<string>('');
  const [wordCount, setWordCount] = useState(0);
  const [indicator, setIndicator] = useState<string | undefined>(undefined);

  const onNextTick = () => {
    if (startedAt === null || updatedAt === null) return;
    const now = Date.now();
    const idle = now - updatedAt;
    setColor(undefined);
    setWarnClass('');
    if (now - startedAt > duration) {
      return 'success';
    }
    if (mode !== 'dangerous') return 'continue';
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
      {startedAt && !endedAt && (
        <ClockTicking startedAt={startedAt} duration={duration} color={color} />
      )}
      <IonContent>
        <KiwimeriEditor
          additionalClassNames={'timed-writing ' + warnClass}
          content={initValue}
          enableToolbar={false}
          enableDebugTreeView={false}
          enableHistory={false}
        >
          <KeystrokeListenerPlugin
            onWritingKey={editorState => {
              setIndicator('primary');
              setTimeout(() => {
                setIndicator(undefined);
              }, 250);
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
            <IonIcon color={indicator} icon={APPICONS.indicator}></IonIcon>
            {endedAt && (
              <IonButton
                onClick={() => {
                  const content = editorState?.toJSON();
                  if (content) {
                    onSave(JSON.stringify(content));
                  }
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
