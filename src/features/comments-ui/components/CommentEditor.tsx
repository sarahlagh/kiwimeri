import KiwimeriEditor from '@/common/wysiwyg/lexical/KiwimeriEditor';
import { initialContent } from '@/db/collection.service';
import { docAnnotationsService } from '@/domain/document-annotations/doc-annotations.service';
import { EditorState } from 'lexical';

type CommentEditorProps = {
  commentId: string;
  editable?: boolean;
};

const CommentEditor = ({ commentId, editable = true }: CommentEditorProps) => {
  const content = docAnnotationsService.getContent(commentId);
  let classNames = `comment-editor`;
  if (docAnnotationsService.isConflict(commentId)) {
    classNames += ' comment-is-conflict';
  }
  return (
    <KiwimeriEditor
      id={commentId}
      additionalClassNames={classNames}
      editable={editable}
      content={content || initialContent()}
      enableToolbar={false}
      enableDebugTreeView={false}
      onChange={(editorState: EditorState) => {
        docAnnotationsService.editComment(commentId, editorState.toJSON());
      }}
    />
  );
};

export default CommentEditor;
