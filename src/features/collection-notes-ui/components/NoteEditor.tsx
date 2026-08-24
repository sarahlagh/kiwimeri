import { SpaceTables } from '@/core/db/store-constants';
import { schedule } from '@/core/tasks/scheduler.service';
import { TaskNames } from '@/core/tasks/tasks-registry';
import { initialContent } from '@/domain/collection/collection.service';
import { annotsService } from '@/domain/collection/doc-annotations.service';
import { writer } from '@/domain/document-edits/document-edits.service';
import { KiwimeriEditor } from '@/features/document-editor';
import type { EditorState } from 'lexical';
import { useEffect } from 'react';

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
  useEffect(() => {
    schedule.flushByName(TaskNames.FAST_WRITE);
  }, [noteId]);
  return (
    <KiwimeriEditor
      id={noteId}
      additionalClassNames={classNames}
      editable={editable}
      content={content || initialContent()}
      enableToolbar={false}
      enableDebugTreeView={false}
      onChange={(
        editorState: EditorState,
        isSelectionChange,
        blocksChanged,
        hasDeletedNodes
      ) => {
        writer.fastWrite(
          SpaceTables.Annotations,
          noteId,
          editorState,
          isSelectionChange,
          blocksChanged,
          hasDeletedNodes
        );
      }}
    />
  );
};

export default NoteEditor;
