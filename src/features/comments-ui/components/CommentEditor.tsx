import KiwimeriEditor from '@/common/wysiwyg/lexical/KiwimeriEditor';
import { initialContent } from '@/db/collection.service';
import { commentsService } from '@/domain/comments/comments.service';
import { EditorState } from 'lexical';

type CommentEditorProps = {
  commentId: string;
  editable?: boolean;
};

const CommentEditor = ({ commentId, editable = true }: CommentEditorProps) => {
  const content = commentsService.getContent(commentId);
  return (
    <KiwimeriEditor
      id={commentId}
      additionalClassNames={'comment-editor'}
      editable={editable}
      content={content || initialContent()}
      enableToolbar={false}
      enableDebugTreeView={false}
      onChange={(editorState: EditorState) => {
        commentsService.editComment(commentId, editorState.toJSON());
      }}
    />
  );
};

export default CommentEditor;
