import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonFooter,
  IonItem,
  IonLabel,
  IonRadio,
  IonRadioGroup,
  IonToggle
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import { SessionMode } from '../mode';

export const StartPanel = ({
  duration: initDuration,
  mode: initMode,
  onStart
}: {
  duration: number;
  mode: SessionMode;
  onStart: (duration: number, mode: SessionMode) => void;
}) => {
  const [duration, setDuration] = useState<number>(initDuration);
  const [mode, setMode] = useState<SessionMode>(initMode);
  const options = [5, 10, 15, 20, 25];
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
              Choose a length for your writing session. Once you start, you must
              keep writing or all progress will be lost. You will have the
              option to save your work in a new document once you finish. This
              feature is inspired by Squibler&apos;s Most Dangerous Writing App
              (https://www.squibler.io/dangerous-writing-prompt-app).
            </Trans>
          </IonCardSubtitle>
        </IonCardHeader>
        <IonCardContent>
          <IonItem>
            <IonLabel>
              <Trans>
                Less dangerous mode (session is still timed but you will not
                lose progress on pause)
              </Trans>
            </IonLabel>
            <IonToggle
              slot="end"
              checked={mode === 'less-dangerous'}
              onIonChange={e => {
                setMode(e.detail.checked ? 'less-dangerous' : 'dangerous');
              }}
            ></IonToggle>
          </IonItem>
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
          <IonFooter style={{ paddingTop: '12px' }}>
            <IonButton slot="start" onClick={() => onStart(duration, mode)}>
              <Trans>Start Writing</Trans>
            </IonButton>
          </IonFooter>
        </IonCardContent>
      </IonCard>
    </IonContent>
  );
};
