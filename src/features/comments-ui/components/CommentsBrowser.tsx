import { useEffect, type JSX } from 'react';

import { useQueryResultIds } from '@/core/db/queries-helper';
import { commentsService } from '@/domain/comments/comments.service';
import { IonNote } from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import useCommentSort from '../hooks/useCommentSort';
import useSelectedComment from '../hooks/useSelectedComment';
import fetchCommentsQuery from '../queries/fetchCommentsQuery';
import CommentActions from './CommentActions';
import CommentEditor from './CommentEditor';
import './CommentsBrowser.scss';
import { CommentsMenu } from './CommentsMenu';

export type CommentsBrowserProps = {
  id: string;
  showActions?: boolean;
  editable?: boolean;
};

export default function CommentsBrowser({
  id: docId,
  showActions = true,
  editable = true
}: CommentsBrowserProps): JSX.Element {
  const sort = useCommentSort(docId);
  useEffect(() => {
    fetchCommentsQuery.loadParams({
      itemId: docId
    });
  }, [docId]);
  useEffect(() => {
    return () => {
      fetchCommentsQuery.close();
    };
  }, []);
  const commentIds = useQueryResultIds(
    fetchCommentsQuery,
    sort.by,
    sort.descending
  );
  const selectedId = useSelectedComment(docId);
  const isConflict = selectedId && commentsService.isConflict(selectedId);

  return (
    <div className="comment-browser">
      <div
        className={
          'comment-area' +
          (!selectedId ? ' empty' : '') +
          (isConflict ? ' comment-is-conflict' : '')
        }
      >
        {!selectedId ? (
          <IonNote>
            <Trans>select a comment</Trans>
          </IonNote>
        ) : (
          <>
            <CommentEditor commentId={selectedId} editable={editable} />
            {showActions && (
              <CommentActions docId={docId} commentId={selectedId} />
            )}
          </>
        )}
      </div>
      <div className="comment-browser-separator"></div>
      <div
        className={'comment-menu' + (commentIds.length === 0 ? ' empty' : '')}
      >
        <CommentsMenu
          docId={docId}
          selectedId={selectedId}
          editable={editable}
          showActions={showActions}
        />
      </div>
    </div>
  );
}
