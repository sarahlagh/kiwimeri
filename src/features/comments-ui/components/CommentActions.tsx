import { dateToStr } from '@/common/date-utils';
import ConfirmYesNoDialog from '@/common/modals/ConfirmYesNoDialog';
import { APPICONS } from '@/constants';
import { docAnnotationsService } from '@/domain/document-annotations/doc-annotations.service';
import { resumeService } from '@/domain/resume-state/resume-state.service';
import { IonButton, IonButtons, IonIcon } from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';

type CommentActionsProps = { docId: string; commentId: string };

const CommentActions = ({ docId, commentId }: CommentActionsProps) => {
  const { t } = useLingui();
  const [expand, setExpand] = useState(false);
  const [showCreatedAt, setShowCreatedAt] = useState(true);
  const delTrigger = `${commentId}-delete-btn`;
  const { createdAt, updatedAt } =
    docAnnotationsService.getAnnotInfo(commentId);
  return (
    <>
      {expand && (
        <div className="comment-info">
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
      <div className={'comment-actions'}>
        <IonButtons>
          <IonButton
            aria-label={t`Toggle actions`}
            onClick={() => setExpand(!expand)}
          >
            <IonIcon icon={APPICONS.itemActions}></IonIcon>
          </IonButton>
          {expand && (
            <>
              <IonButton id={delTrigger} aria-label={t`Delete comment`}>
                <IonIcon icon={APPICONS.deleteAction}></IonIcon>
              </IonButton>
              <ConfirmYesNoDialog
                trigger={delTrigger}
                onClose={confirmed => {
                  if (confirmed) {
                    docAnnotationsService.deleteComment(commentId);
                    resumeService.setLastSelectedComment(docId, null);
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

export default CommentActions;
