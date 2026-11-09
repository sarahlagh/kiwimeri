import { SpaceTables } from '@/core/db/store-constants';
import { schedule } from '@/core/tasks/scheduler.service';
import { TaskNames } from '@/core/tasks/tasks-registry';
import { annotsService } from '@/domain/collection/doc-annotations.service';
import { deviceSettings } from '@/domain/device-settings/device-settings.service';
import { writer } from '@/domain/document-edits/document-edits.service';
import {
  getChangedBlocks,
  OnChangePluginPayload,
  RichTextEditor
} from '@/features/rich-text-editor';
import { useCallback, useEffect } from 'react';

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
  const onChange: (change: OnChangePluginPayload) => void = useCallback(
    payload => {
      if (!payload.isSelectionChange) {
        const { blocksChanged, hasDeletedNodes } = getChangedBlocks(payload);
        writer.fastWriteOrCommit(
          SpaceTables.Annotations,
          noteId,
          payload.editorState,
          blocksChanged,
          hasDeletedNodes,
          deviceSettings.isFastWriteWatchMode() ? payload : undefined
        );
      }
    },
    [noteId]
  );
  return (
    <RichTextEditor
      additionalClassNames={classNames}
      historyId={noteId}
      editable={editable}
      initialState={content}
      enableHistory={true}
      enableToolbar={false}
      enableDebugTree={false}
      ignoreSelectionChange={false}
      resumeLastSelection={false}
      onChange={onChange}
    />
  );
};

export default NoteEditor;
