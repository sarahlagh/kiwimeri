import SortableList from '@/common/dnd/containers/SortableList';
import { APPICONS } from '@/constants';
import { commentsService } from '@/domain/comments/comments.service';
import fetchCommentsQuery from '@/features/comments-ui/queries/fetchCommentsQuery';
import { IonButton, IonButtons, IonIcon } from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import { Id } from 'tinybase/common';
import useCommentSort from '../hooks/useCommentSort';
import { CommentMenuPreview } from './CommentMenuPreview';
import CommentsSortFilterBtn from './CommentsSortFilterBtn';

type CommentMenuProps = {
  docId: string;
  selectedId?: Id;
  onSelect: (selectedId: Id) => void;
  showActions: boolean;
  editable?: boolean;
};

export const CommentsMenu = ({
  docId,
  selectedId,
  onSelect,
  showActions,
  editable = true
}: CommentMenuProps) => {
  const sort = useCommentSort(docId);
  const comments = fetchCommentsQuery.useResults(sort.by, sort.descending);
  return (
    <>
      {showActions && editable && (
        <div className="comment-actions-bar">
          <IonButtons>
            <IonButton
              size="small"
              fill="clear"
              onClick={() => {
                commentsService.addComment(docId, comments.length);
              }}
            >
              <IonIcon icon={APPICONS.addGeneric}></IonIcon>
            </IonButton>

            <CommentsSortFilterBtn docId={docId} />
          </IonButtons>
        </div>
      )}

      {comments.length === 0 && <Trans>create a comment</Trans>}
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
              onSelect(comment.id);
            }}
          />
        ))}
      </SortableList>
    </>
  );
};
