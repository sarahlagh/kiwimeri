import { APPICONS } from '@/constants';
import { useQueryResults } from '@/core/db/queries-helper';
import { docAnnotationsService } from '@/domain/collection/doc-annotations.service';
import { resumeService } from '@/domain/collection/resume-state.service';
import SortableList from '@/shared/dnd/containers/SortableList';
import { IonButton, IonButtons, IonIcon, IonNote } from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Id } from 'tinybase/common';
import useNotesSort from '../hooks/useNotesSort';
import fetchNotesQuery from '../queries/fetchNotesQuery';
import { NotesMenuPreview } from './NotesMenuPreview';
import NotesSortFilterBtn from './NotesSortFilterBtn';

type NoteMenuProps = {
  docId: string;
  selectedId?: Id;
  showActions: boolean;
  editable?: boolean;
};

export const NotesMenu = ({
  docId,
  selectedId,
  showActions,
  editable = true
}: NoteMenuProps) => {
  const { t } = useLingui();
  const sort = useNotesSort(docId);
  const notes = useQueryResults(fetchNotesQuery, sort.by, sort.descending);
  return (
    <>
      {showActions && editable && (
        <div className={'note-actions-bar'}>
          <IonButtons>
            <IonButton
              aria-label={t`add a note`}
              size="small"
              fill="clear"
              onClick={() => {
                const noteId = docAnnotationsService.addNote(
                  docId,
                  notes.length
                );
                resumeService.setLastSelectedNote(docId, noteId);
              }}
            >
              <IonIcon icon={APPICONS.addGeneric}></IonIcon>
            </IonButton>

            <NotesSortFilterBtn docId={docId} />
          </IonButtons>
        </div>
      )}

      {notes.length === 0 && (
        <IonNote>
          <Trans>create a note</Trans>
        </IonNote>
      )}
      <SortableList
        style={{ height: 'calc(100% - 28px)', overflowY: 'auto' }}
        className="inner-list"
        items={notes}
        sortDisabled={sort.by !== 'order'}
        onItemMove={(from, to) => {
          docAnnotationsService.reorder(notes, from, to);
        }}
      >
        {notes.map(note => (
          <NotesMenuPreview
            key={note.id}
            note={note}
            selected={selectedId === note.id}
            onSelect={() => {
              resumeService.setLastSelectedNote(docId, note.id);
            }}
          />
        ))}
      </SortableList>
    </>
  );
};
