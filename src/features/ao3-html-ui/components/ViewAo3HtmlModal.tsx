import { unminimizeContentFromStorage } from '@/common_to_migrate/wysiwyg/compress-file-content';
import { APPICONS } from '@/constants';
import collectionService from '@/db_to_migrate/collection.service';
import formatConverter from '@/domain/format-conversion/format-converter.service';
import { AO3_HTML_FORMATTER } from '@/domain/format-conversion/lex-conversion/formatters/ao3-html-formatter';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTextarea,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import { useRef } from 'react';

type ManageHistoryModalProps = {
  id: string;
  dismiss: (version?: string, role?: 'goToVersion' | 'restore') => void;
};

const ViewAo3HtmlModal = ({ id, dismiss }: ManageHistoryModalProps) => {
  const ref = useRef<HTMLIonTextareaElement>(null);
  const content = unminimizeContentFromStorage(
    collectionService.getItemContent(id) || ''
  );
  const ao3Html = formatConverter.to(content, AO3_HTML_FORMATTER);
  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            <Trans>AO3 Viewer</Trans>
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => dismiss()}>
              <IonIcon icon={APPICONS.closeAction} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonTextarea ref={ref} rows={30} value={ao3Html}></IonTextarea>
      </IonContent>
    </>
  );
};

export default ViewAo3HtmlModal;
