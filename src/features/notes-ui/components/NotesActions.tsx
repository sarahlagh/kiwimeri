import { dateToStr } from '@/common_to_migrate/date-utils';
import { APPICONS } from '@/constants';
import { docAnnotationsService } from '@/domain/collection/doc-annotations.service';
import { resumeService } from '@/domain/collection/resume-state.service';
import ConfirmYesNoDialog from '@/shared/modals/ConfirmYesNoDialog';
import { IonButton, IonButtons, IonIcon } from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';

type NoteActionsProps = { docId: string; noteId: string };

const NoteActions = ({ docId, noteId }: NoteActionsProps) => {
  const { t } = useLingui();
  const [expand, setExpand] = useState(false);
  const [showCreatedAt, setShowCreatedAt] = useState(true);
  const delTrigger = `${noteId}-delete-btn`;
  const { createdAt, updatedAt } = docAnnotationsService.getAnnotInfo(noteId);
  return (
    <>
      {expand && (
        <div className="note-info">
          {showCreatedAt && (
            <p>
              <Trans>Created at: {dateToStr('relative', createdAt)}</Trans>{' '}
            </p>
          )}
          {!showCreatedAt && (
            <p>
              <Trans>Updated at: {dateToStr('relative', updatedAt)}</Trans>
            </p>
          )}
        </div>
      )}
      <div className={'note-actions'}>
        <IonButtons>
          <IonButton
            aria-label={t`Toggle actions`}
            onClick={() => setExpand(!expand)}
          >
            <IonIcon icon={APPICONS.itemActions}></IonIcon>
          </IonButton>
          {expand && (
            <>
              <IonButton id={delTrigger} aria-label={t`Delete note`}>
                <IonIcon icon={APPICONS.deleteAction}></IonIcon>
              </IonButton>
              <ConfirmYesNoDialog
                trigger={delTrigger}
                onClose={confirmed => {
                  if (confirmed) {
                    docAnnotationsService.delete(noteId);
                    resumeService.setLastSelectedNote(docId, null);
                  }
                }}
              />
              <IonButton
                aria-label={t`Switch info`}
                onClick={() => {
                  setShowCreatedAt(!showCreatedAt);
                }}
              >
                <IonIcon icon={APPICONS.info}></IonIcon>
              </IonButton>
            </>
          )}
        </IonButtons>
      </div>
    </>
  );
};

export default NoteActions;
