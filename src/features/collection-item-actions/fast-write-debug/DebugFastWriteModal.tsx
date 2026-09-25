import { APPICONS } from '@/constants';
import collectionService from '@/domain/collection/collection.service';
import { writer } from '@/domain/document-edits/document-edits.service';
import formatConverter from '@/domain/format-conversion/format-converter.service';
import GenericExportFileButton from '@/shared/buttons/GenericExportFileButton';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonList,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import React, { useState } from 'react';

type DebugFastWriteModalProps = {
  id: string;
  currentParent: string;
  currentType: string;
  onClose: (parentId?: string, notebookId?: string) => void;
} & React.HTMLAttributes<HTMLIonModalElement>;

const DebugFastWriteModal = ({ id, onClose }: DebugFastWriteModalProps) => {
  const [edits, setEdits] = useState(writer.getEdits('collection', id));
  const content = collectionService.getDocumentContent(id);
  const markdown = formatConverter.toMarkdown(content);
  const reconciledContent = writer.reconcile('collection', id, false);
  const reconciledMarkdown = formatConverter.toMarkdown(reconciledContent);

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            <Trans>Debug</Trans>
          </IonTitle>

          <IonButtons slot="end">
            <IonButton onClick={() => onClose()}>
              <IonIcon icon={APPICONS.closeAction} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonList>
          {edits.length === 0 && (
            <IonItem>
              <Trans>No pending edits</Trans>
            </IonItem>
          )}
          <IonItem>Edits: {edits.length}</IonItem>
          <IonItem>Markdown:</IonItem>
          <IonItem>{markdown}</IonItem>
          <IonItem>Reconciled Markdown:</IonItem>
          <IonItem>{reconciledMarkdown}</IonItem>
        </IonList>
      </IonContent>

      <IonFooter>
        <IonToolbar>
          <IonButtons slot="end">
            <GenericExportFileButton
              label="Export json"
              icon={null}
              getFileTitle={`debug-fast-write-${id}.json`}
              getFileContent={async () => {
                return JSON.stringify(
                  {
                    edits,
                    content,
                    reconciledContent,
                    markdown,
                    reconciledMarkdown
                  },
                  null,
                  2
                );
              }}
            />
            <GenericExportFileButton
              label="Export text"
              icon={null}
              getFileTitle={`debug-fast-write-${id}.txt`}
              getFileContent={async () => {
                return (
                  `${JSON.stringify(edits)}\n\n` +
                  `content: ${JSON.stringify(content)}\n\n` +
                  `reconciled content: ${JSON.stringify(reconciledContent)}\n\n` +
                  `==================================================================================================\n\n` +
                  `${markdown}\n\n\n` +
                  `==================================================================================================\n\n` +
                  `${reconciledMarkdown}\n\n\n`
                );
              }}
            />
            <IonButton
              color={'primary'}
              onClick={() => {
                writer.clear('collection', id);
                setEdits([]);
              }}
            >
              Clear
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonFooter>
    </>
  );
};
export default DebugFastWriteModal;
