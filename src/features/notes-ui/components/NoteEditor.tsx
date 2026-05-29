import KiwimeriEditor from '@/common/wysiwyg/lexical/KiwimeriEditor';
import { initialContent } from '@/db/collection.service';
import { docAnnotationsService } from '@/domain/document-annotations/doc-annotations.service';
import { EditorState } from 'lexical';

type NoteEditorProps = {
  noteId: string;
  editable?: boolean;
};

const NoteEditor = ({ noteId, editable = true }: NoteEditorProps) => {
  const content = docAnnotationsService.getContent(noteId);
  let classNames = `note-editor`;
  if (docAnnotationsService.isConflict(noteId)) {
    classNames += ' note-is-conflict';
  }
  return (
    <KiwimeriEditor
      id={noteId}
      additionalClassNames={classNames}
      editable={editable}
      content={content || initialContent()}
      enableToolbar={false}
      enableDebugTreeView={false}
      onChange={(editorState: EditorState) => {
        docAnnotationsService.edit(noteId, editorState.toJSON());
      }}
    />
  );
};

export default NoteEditor;
