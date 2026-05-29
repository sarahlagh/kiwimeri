import { useEffect, type JSX } from 'react';

import { useQueryResultIds } from '@/core/db/queries-helper';
import { docAnnotationsService } from '@/domain/document-annotations/doc-annotations.service';
import { IonNote } from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import useNotesSort from '../hooks/useNotesSort';
import useSelectedNote from '../hooks/useSelectedNote';
import fetchNotesQuery from '../queries/fetchNotesQuery';
import NoteEditor from './NoteEditor';
import NoteActions from './NotesActions';
import './NotesBrowser.scss';
import { NotesMenu } from './NotesMenu';

export type NotesBrowserProps = {
  id: string;
  showActions?: boolean;
  editable?: boolean;
};

export default function NotesBrowser({
  id: docId,
  showActions = true,
  editable = true
}: NotesBrowserProps): JSX.Element {
  const sort = useNotesSort(docId);
  useEffect(() => {
    fetchNotesQuery.loadParams({
      itemId: docId
    });
  }, [docId]);
  useEffect(() => {
    return () => {
      fetchNotesQuery.close();
    };
  }, []);
  const noteIds = useQueryResultIds(fetchNotesQuery, sort.by, sort.descending);
  const selectedId = useSelectedNote(docId);
  const isConflict = selectedId && docAnnotationsService.isConflict(selectedId);

  return (
    <div className="note-browser">
      <div
        className={
          'note-area' +
          (!selectedId ? ' empty' : '') +
          (isConflict ? ' note-is-conflict' : '')
        }
      >
        {!selectedId ? (
          <IonNote>
            <Trans>select a note</Trans>
          </IonNote>
        ) : (
          <>
            <NoteEditor noteId={selectedId} editable={editable} />
            {showActions && <NoteActions docId={docId} noteId={selectedId} />}
          </>
        )}
      </div>
      <div className="note-browser-separator"></div>
      <div className={'note-menu' + (noteIds.length === 0 ? ' empty' : '')}>
        <NotesMenu
          docId={docId}
          selectedId={selectedId}
          editable={editable}
          showActions={showActions}
        />
      </div>
    </div>
  );
}
