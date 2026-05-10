import { dateToStr } from '@/common/date-utils';
import ConfirmYesNoDialog from '@/common/modals/ConfirmYesNoDialog';
import { APPICONS } from '@/constants';
import { commentsService } from '@/domain/comments/comments.service';
import { resumeService } from '@/domain/resume-state/resume-state.service';
import { IonButton, IonButtons, IonIcon } from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';

type CommentActionsProps = { docId: string; commentId: string };

const CommentActions = ({ docId, commentId }: CommentActionsProps) => {
  const [expand, setExpand] = useState(false);
  const [showCreatedAt, setShowCreatedAt] = useState(true);
  const delTrigger = `${commentId}-delete-btn`;
  const { createdAt, updatedAt } = commentsService.getCommentInfo(commentId);
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
          <IonButton onClick={() => setExpand(!expand)}>
            <IonIcon icon={APPICONS.itemActions}></IonIcon>
          </IonButton>
          {expand && (
            <>
              <IonButton id={delTrigger}>
                <IonIcon icon={APPICONS.deleteAction}></IonIcon>
              </IonButton>
              <ConfirmYesNoDialog
                trigger={delTrigger}
                onClose={confirmed => {
                  if (confirmed) {
                    commentsService.deleteComment(commentId);
                    resumeService.setLastSelectedComment(docId, null);
                  }
                }}
              />
              <IonButton
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
