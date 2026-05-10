import SortableList from '@/common/dnd/containers/SortableList';
import { APPICONS } from '@/constants';
import { commentsService } from '@/domain/comments/comments.service';
import fetchCommentsQuery from '@/features/comments-ui/queries/fetchCommentsQuery';
import { IonButton, IonIcon } from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import { Id } from 'tinybase/common';
import { CommentMenuPreview } from './CommentMenuPreview';

type CommentMenuProps = {
  docId: string;
  selectedId?: Id;
  onSelect?: (selectedId: Id) => void;
  showActions?: boolean;
  editable?: boolean;
};

export const CommentsMenu = ({
  docId,
  selectedId,
  onSelect,
  showActions,
  editable
}: CommentMenuProps) => {
  const comments = fetchCommentsQuery.useResults('createdAt', false);
  return (
    <>
      {showActions && editable && (
        <div className="comment-actions-bar">
          <IonButton
            size="small"
            fill="clear"
            onClick={() => {
              commentsService.addComment(docId, comments.length);
            }}
          >
            <IonIcon icon={APPICONS.addGeneric}></IonIcon>
          </IonButton>

          {/* <OpenSortFilterButton id={docId} sortChoices={sortBy} /> */}

          {/* <IonButton
            size="small"
            fill="clear"
            onClick={() => {
              // commentsService.addComment(docId, comments.length);
            }}
          >
            <IonIcon icon={APPICONS.bulkSelect}></IonIcon>
          </IonButton> */}
        </div>
      )}

      {comments.length === 0 && <Trans>create a comment</Trans>}
      <SortableList
        style={{ height: 'calc(100% - 28px)', overflowY: 'auto' }}
        className="inner-list"
        items={comments}
        // sortDisabled={sort.by !== 'order'}
        // onItemMove={(from, to) => {
        //   collectionService.reorderItems(pages!, from, to, docId);
        // }}
      >
        {comments.map(comment => (
          <CommentMenuPreview
            key={comment.id}
            comment={comment}
            selected={selectedId === comment.id}
            onSelect={() => {
              if (onSelect) onSelect(comment.id);
            }}
          />
        ))}
      </SortableList>
    </>
  );
};
