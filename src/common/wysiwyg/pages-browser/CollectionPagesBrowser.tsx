import { type JSX } from 'react';

import { IonButton, IonIcon, IonItem, IonList } from '@ionic/react';

import { PagePreview } from '@/collection/collection';
import OpenSortFilterButton from '@/common/buttons/OpenSortFilterButton';
import SortableList from '@/common/dnd/containers/SortableList';
import { GET_DOCUMENT_ROUTE, GET_PAGE_ROUTE } from '@/common/routes';
import { getSearchParams } from '@/common/utils';
import { APPICONS, CONFLICT_STR } from '@/constants';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import { useLingui } from '@lingui/react/macro';
import { useHistory, useLocation } from 'react-router';
import './CollectionPagesBrowser.scss';

export type CollectionPagesBrowserProps = {
  id: string;
  docId: string;
  docPreview: string;
  pages?: PagePreview[];
};

interface PagePreviewItemProps {
  page: Pick<PagePreview, 'id' | 'preview' | 'conflict' | 'order'>;
  defaultVal: string;
  className?: string;
  selected: boolean;
  onClick: (pageId: string) => void;
}

const PagePreviewItem = ({
  page,
  defaultVal,
  className,
  selected,
  onClick
}: PagePreviewItemProps) => {
  const emptyPage = (page.preview?.length || 0) === 0;
  let classNames = `page-item ${className}`;
  if (emptyPage) {
    classNames += ' page-item-empty';
  }
  if (selected) {
    classNames += ' page-item-selected';
  }
  if (page.conflict) {
    classNames += ' page-item-conflict';
  }
  return (
    <IonItem
      button
      className={classNames}
      disabled={selected}
      onClick={() => {
        onClick(page.id);
      }}
    >
      {page.conflict ? CONFLICT_STR : ''}
      {!emptyPage ? page.preview : defaultVal}
    </IonItem>
  );
};

export default function CollectionPagesBrowser({
  id,
  docId,
  docPreview,
  pages
}: CollectionPagesBrowserProps): JSX.Element {
  const { t } = useLingui();
  const defaultDocPreview = t`empty doc`;
  const defaultPagePreview = t`empty page`;

  const history = useHistory();
  const location = useLocation();
  const notebook = notebooksService.useCurrentNotebook();
  const folderId = getSearchParams(location.search).folder || notebook;
  const sort = collectionService.useItemEffectiveDisplayOpts(docId).sort;
  console.debug('sort by', sort.by);
  // TODO turn doc to page and vice-versa via drag & drop
  return (
    <>
      <div className="page-browser">
        <IonItem lines="none">
          <IonButton
            fill="clear"
            onClick={() => {
              collectionService.addPage(docId);
            }}
          >
            <IonIcon icon={APPICONS.addGeneric}></IonIcon>
          </IonButton>

          {(pages?.length || 0) > 0 && <OpenSortFilterButton id={docId} />}
        </IonItem>
        <IonList className="inner-list">
          <PagePreviewItem
            className="page-item-doc"
            key={docId}
            page={{ id: docId, preview: docPreview, order: 0 }}
            selected={id === docId}
            onClick={() => {
              history.push(GET_DOCUMENT_ROUTE(folderId, docId));
            }}
            defaultVal={defaultDocPreview}
          />
        </IonList>
        <SortableList
          style={{ maxHeight: '400px', overflowY: 'auto' }}
          className="inner-list"
          items={pages || []}
          sortDisabled={sort.by !== 'order'}
          onItemMove={(from, to) => {
            collectionService.reorderItems(pages!, from, to);
          }}
        >
          {(pages || []).map(page => (
            <PagePreviewItem
              key={page.id}
              page={page}
              selected={id === page.id}
              onClick={pageId => {
                history.push(GET_PAGE_ROUTE(folderId, docId, pageId));
              }}
              defaultVal={defaultPagePreview}
            />
          ))}
        </SortableList>
      </div>
    </>
  );
}
