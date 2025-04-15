import platformService from '@/common/services/platform.service';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonInput
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
const FilesystemSyncSettings = () => {
  const { t } = useLingui();

  return (
    <IonCard disabled={platformService.isWeb()} className="primary">
      <IonCardHeader>
        <IonCardTitle>
          <Trans>Filesystem</Trans>
        </IonCardTitle>
        <IonCardSubtitle>
          <Trans>Synchronize your collection on the filesystem</Trans>
        </IonCardSubtitle>
      </IonCardHeader>

      <IonCardContent>
        <IonButton></IonButton>
        <IonInput
          aria-label={t`Pick a directory for your backups`}
          placeholder={t`Pick a directory for your backups`}
          value=""
        ></IonInput>
        <IonButton fill="clear">
          <Trans>Pick a directory for your backups</Trans>
        </IonButton>
      </IonCardContent>
    </IonCard>
  );
};
export default FilesystemSyncSettings;
