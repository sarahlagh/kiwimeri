import { initialContent } from '@/domain/collection/collection.service';
import { annotsService } from '@/domain/collection/doc-annotations.service';
import { KiwimeriEditor } from '@/features/document-editor';
import type { EditorState } from 'lexical';

type NoteEditorProps = {
  noteId: string;
  editable?: boolean;
};

const NoteEditor = ({ noteId, editable = true }: NoteEditorProps) => {
  const content = annotsService.getContent(noteId);
  let classNames = `note-editor`;
  if (annotsService.isConflict(noteId)) {
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
        annotsService.edit(noteId, editorState.toJSON());
      }}
    />
  );
};

export default NoteEditor;
