import { APPICONS } from '@/constants';
import { docAnnotationsService } from '@/domain/document-annotations/doc-annotations.service';
import {
  NotesSort,
  NotesSortType,
  sortBy
} from '@/domain/document-annotations/model';
import GenericSortFilter from '@/shared/utils/sort-filter/GenericSortFilter';
import { IonButton, IonIcon, useIonPopover } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import useNotesSort from '../hooks/useNotesSort';

type NotesSortFilterBtnProps = {
  docId: string;
};

const NotesSortFilterBtn = ({ docId }: NotesSortFilterBtnProps) => {
  const { t } = useLingui();
  const sort = useNotesSort(docId);
  const [present] = useIonPopover(GenericSortFilter<NotesSortType>, {
    searchEnabled: false,
    sortEnabled: true,
    sort: sort,
    allowedSorts: sortBy,
    onSortChange: (sort?: NotesSort) => {
      if (sort) {
        docAnnotationsService.setNotesSortOnDocument(docId, sort);
      }
    }
  });

  return (
    <>
      <IonButton
        aria-label={t`sort notes`}
        fill="clear"
        style={{ margin: '0' }}
        onClick={e => {
          e.stopPropagation();
          e.preventDefault();
          present({ event: e.nativeEvent, alignment: 'end' });
        }}
      >
        <IonIcon icon={APPICONS.sortFilter}></IonIcon>
      </IonButton>
    </>
  );
};

export default NotesSortFilterBtn;
