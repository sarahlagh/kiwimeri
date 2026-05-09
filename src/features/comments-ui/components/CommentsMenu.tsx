import SortableList from '@/common/dnd/containers/SortableList';
import { APPICONS, PREVIEW_SIZE } from '@/constants';
import { commentsService } from '@/domain/comments/comments.service';
import { CommentResult } from '@/domain/comments/model';
import fetchCommentsQuery from '@/domain/comments/queries/fetchCommentsQuery';
import { IonButton, IonIcon, IonItem } from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import { Id } from 'tinybase/common';

type CommentMenuPreviewProps = {
  comment: CommentResult;
  selected?: boolean;
  onSelect?: (commentId: string) => void;
};

type CommentMenuProps = {
  docId: string;
  selectedId?: Id;
  onSelect?: (selectedId: Id) => void;
  showActions?: boolean;
  editable?: boolean;
};

const CommentMenuPreview = ({
  comment,
  selected = false,
  onSelect
}: CommentMenuPreviewProps) => {
  const emptyPage = comment.plainText.length === 0;
  let classNames = `comment-preview`;
  if (emptyPage) {
    classNames += ' comment-preview-empty';
  }
  if (selected) {
    classNames += ' comment-preview-selected';
  }
  return (
    <IonItem
      button
      className={classNames}
      disabled={selected}
      onClick={() => {
        if (onSelect) onSelect(comment.id);
      }}
    >
      {emptyPage ? (
        <Trans>empty comment</Trans>
      ) : (
        comment.plainText.substring(0, PREVIEW_SIZE)
      )}
    </IonItem>
  );
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
