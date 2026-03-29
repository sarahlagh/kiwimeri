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
  IonRadio,
  IonRadioGroup
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';

export const StartPanel = ({
  onStart
}: {
  onStart: (duration: number) => void;
}) => {
  const [duration, setDuration] = useState<number>(10);
  const options = [5, 10, 15, 20];
  // TODO allow custom time
  // TODO select different modes
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
