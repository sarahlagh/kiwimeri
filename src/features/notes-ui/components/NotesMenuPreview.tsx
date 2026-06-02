import { IonItem } from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import useNotePreview from '../hooks/useNotePreview';
import { NoteResult } from '../model';

type NotesMenuPreviewProps = {
  note: NoteResult;
  selected?: boolean;
  onSelect?: (noteId: string) => void;
};

export const NotesMenuPreview = ({
  note,
  selected = false,
  onSelect
}: NotesMenuPreviewProps) => {
  const preview = useNotePreview(note.id);
  const emptyNote = !preview || preview.length === 0;
  let classNames = `note-preview`;
  if (emptyNote) {
    classNames += ' note-preview-empty';
  }
  if (selected) {
    classNames += ' note-preview-selected';
  }
  if (note.conflict) {
    classNames += ' note-is-conflict';
  }
  return (
    <IonItem
      button
      className={classNames}
      disabled={selected}
      onClick={() => {
        if (onSelect) onSelect(note.id);
      }}
    >
      {emptyNote ? (
        <Trans>empty note</Trans>
      ) : note.conflict ? (
        <Trans>-- conflict --</Trans>
      ) : (
        preview
      )}
    </IonItem>
  );
};
