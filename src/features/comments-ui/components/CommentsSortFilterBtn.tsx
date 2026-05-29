import { APPICONS } from '@/constants';
import { docAnnotationsService } from '@/domain/document-annotations/doc-annotations.service';
import {
  CommentSort,
  CommentSortType,
  sortBy
} from '@/domain/document-annotations/model';
import GenericSortFilter from '@/shared/utils/sort-filter/GenericSortFilter';
import { IonButton, IonIcon, useIonPopover } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import useCommentSort from '../hooks/useCommentSort';

type CommentsSortFilterBtnProps = {
  docId: string;
};

const CommentsSortFilterBtn = ({ docId }: CommentsSortFilterBtnProps) => {
  const { t } = useLingui();
  const sort = useCommentSort(docId);
  const [present] = useIonPopover(GenericSortFilter<CommentSortType>, {
    searchEnabled: false,
    sortEnabled: true,
    sort: sort,
    allowedSorts: sortBy,
    onSortChange: (sort?: CommentSort) => {
      if (sort) {
        docAnnotationsService.setCommentSort(docId, sort);
      }
    }
  });

  return (
    <>
      <IonButton
        aria-label={t`sort comments`}
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

export default CommentsSortFilterBtn;
