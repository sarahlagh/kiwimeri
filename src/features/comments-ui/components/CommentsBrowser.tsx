import { useEffect, useState, type JSX } from 'react';

import fetchCommentsQuery from '@/features/comments-ui/queries/fetchCommentsQuery';
import { IonNote } from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import { Id } from 'tinybase/with-schemas';
import CommentEditor from './CommentEditor';
import './CommentsBrowser.scss';
import { CommentsMenu } from './CommentsMenu';
import CommentToolbar from './CommentToolbar';

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
  // const sort = collectionService.useItemEffectiveDisplayOpts(docId).sort;
  // const query = useGenericQuery(fetchCommentsQuery, {
  //   itemId: docId
  // });
  useEffect(() => {
    fetchCommentsQuery.loadParams({
      itemId: docId
    });
    setSelectedId(undefined);
  }, [docId]);
  const commentIds = fetchCommentsQuery.useResultsIds('createdAt', false);
  const [selectedId, setSelectedId] = useState<Id | undefined>();

  // auto select first comment
  useEffect(() => {
    if (
      (!selectedId || !commentIds.find(c => c === selectedId)) &&
      commentIds.length > 0
    ) {
      setSelectedId(commentIds[0]);
    } else setSelectedId(undefined);
  }, [commentIds]);

  return (
    <div className="comment-browser">
      <div className="comment-area">
        {!selectedId ? (
          <IonNote>
            <Trans>select a comment</Trans>
          </IonNote>
        ) : (
          <>
            <CommentEditor commentId={selectedId} editable={editable} />
            {showActions && <CommentToolbar commentId={selectedId} />}
          </>
        )}
      </div>
      <div className="comment-browser-separator"></div>
      <div className="comment-menu">
        <CommentsMenu
          docId={docId}
          selectedId={selectedId}
          onSelect={commentId => setSelectedId(commentId)}
          editable={editable}
          showActions={showActions}
        />
      </div>
    </div>
  );
}
