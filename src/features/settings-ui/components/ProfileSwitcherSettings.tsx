import { APPICONS } from '@/constants';
import { getCurrentProfile, setCurrentProfile } from '@/core/db/store';
import { profileService } from '@/domain/profiles/profile.service';
import {
  IonAlert,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import useProfiles from '../hooks/useProfiles';

const ProfileSwitcherSettings = () => {
  const { t } = useLingui();
  const profile = getCurrentProfile();
  const [selectedProfile, setSelectedProfile] = useState(profile);
  const availableProfiles = useProfiles();
  const deletableProfiles = availableProfiles.filter(
    name => name !== 'default' && name !== selectedProfile
  );

  return (
    <IonCard className="primary">
      <IonCardHeader>
        <IonCardTitle>
          <Trans>Profile Settings</Trans>
        </IonCardTitle>
        <IonCardSubtitle>
          <Trans>
            Change the current app profile here. Restart for this change to
            apply.
          </Trans>
        </IonCardSubtitle>
      </IonCardHeader>

      <IonCardContent>
        <IonList>
          <IonItem lines="none">
            <IonSelect
              label={t`Current profile`}
              value={selectedProfile}
              onIonChange={e => {
                const newValue = e.detail.value as string;
                setCurrentProfile(newValue);
                setSelectedProfile(newValue);
              }}
            >
              {availableProfiles.map(name => (
                <IonSelectOption key={name} value={name}>
                  {name}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
          <IonItem lines="none">
            <IonLabel>
              <Trans>Create a new profile</Trans>
            </IonLabel>
            <IonButton slot="end" fill="clear" id={'add-profile'}>
              <IonIcon icon={APPICONS.addGeneric} />
            </IonButton>
            <IonAlert
              trigger="add-profile"
              header={t`Name your new profile`}
              inputs={[
                {
                  type: 'text',
                  placeholder: t`profile name`,
                  name: 'profileName',
                  attributes: {
                    maxlength: 30
                  }
                }
              ]}
              buttons={[
                {
                  text: t`cancel`,
                  role: 'cancel'
                },
                {
                  text: t`ok`,
                  handler: value => {
                    const profileName = value?.profileName;
                    if (availableProfiles.includes(profileName)) return; // ignore if already exists
                    profileService.createProfile(profileName);
                  }
                }
              ]}
            ></IonAlert>
          </IonItem>
          {deletableProfiles.length > 0 && (
            <IonItem lines="none">
              <IonSelect
                label={t`Delete profile`}
                onIonChange={e => {
                  const newValue = e.detail.value as string;
                  profileService.deleteProfile(newValue);
                }}
              >
                {deletableProfiles.map(name => (
                  <IonSelectOption key={name} value={name}>
                    {name}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
          )}
        </IonList>
      </IonCardContent>
    </IonCard>
  );
};

export default ProfileSwitcherSettings;
