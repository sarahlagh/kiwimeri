import { IonItem } from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import useCommentPreview from '../hooks/useCommentPreview';
import { CommentResult } from '../model';

type CommentMenuPreviewProps = {
  comment: CommentResult;
  selected?: boolean;
  onSelect?: (commentId: string) => void;
};

export const CommentMenuPreview = ({
  comment,
  selected = false,
  onSelect
}: CommentMenuPreviewProps) => {
  const preview = useCommentPreview(comment.id);
  const emptyPage = !preview || preview.length === 0;
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
      {emptyPage ? <Trans>empty comment</Trans> : preview}
    </IonItem>
  );
};
