import SortableList from '@/common/dnd/containers/SortableList';
import { APPICONS } from '@/constants';
import { commentsService } from '@/domain/comments/comments.service';
import { resumeService } from '@/domain/resume-state/resume-state.service';
import { IonButton, IonButtons, IonIcon, IonNote } from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import { Id } from 'tinybase/common';
import useCommentSort from '../hooks/useCommentSort';
import fetchCommentsQuery from '../queries/fetchCommentsQuery';
import { CommentMenuPreview } from './CommentMenuPreview';
import CommentsSortFilterBtn from './CommentsSortFilterBtn';

type CommentMenuProps = {
  docId: string;
  selectedId?: Id;
  showActions: boolean;
  editable?: boolean;
};

export const CommentsMenu = ({
  docId,
  selectedId,
  showActions,
  editable = true
}: CommentMenuProps) => {
  const sort = useCommentSort(docId);
  const comments = fetchCommentsQuery.useResults(sort.by, sort.descending);
  return (
    <>
      {showActions && editable && (
        <div className={'comment-actions-bar'}>
          <IonButtons>
            <IonButton
              size="small"
              fill="clear"
              onClick={() => {
                const commentId = commentsService.addComment(
                  docId,
                  comments.length
                );
                resumeService.setLastSelectedComment(docId, commentId);
              }}
            >
              <IonIcon icon={APPICONS.addGeneric}></IonIcon>
            </IonButton>

            <CommentsSortFilterBtn docId={docId} />
          </IonButtons>
        </div>
      )}

      {comments.length === 0 && (
        <IonNote>
          <Trans>create a comment</Trans>
        </IonNote>
      )}
      <SortableList
        style={{ height: 'calc(100% - 28px)', overflowY: 'auto' }}
        className="inner-list"
        items={comments}
        sortDisabled={sort.by !== 'order'}
        onItemMove={(from, to) => {
          commentsService.reorderComments(comments, from, to);
        }}
      >
        {comments.map(comment => (
          <CommentMenuPreview
            key={comment.id}
            comment={comment}
            selected={selectedId === comment.id}
            onSelect={() => {
              resumeService.setLastSelectedComment(docId, comment.id);
            }}
          />
        ))}
      </SortableList>
    </>
  );
};
