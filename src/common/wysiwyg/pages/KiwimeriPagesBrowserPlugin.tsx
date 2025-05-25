import { type JSX } from 'react';

import { IonItem, IonList } from '@ionic/react';

import { PagePreview } from '@/collection/collection';
import { GET_DOCUMENT_ROUTE, GET_PAGE_ROUTE } from '@/common/routes';
import { getSearchParams } from '@/common/utils';
import { CONFLICT_STR, ROOT_FOLDER } from '@/constants';
import { useLingui } from '@lingui/react/macro';
import { useHistory, useLocation } from 'react-router';
import './KiwimeriPagesBrowserPlugin.scss';

interface KiwimeriPagesBrowserPluginProps {
  id: string;
  docId: string;
  docPreview: string;
  pages?: PagePreview[];
}

interface PagePreviewItemProps {
  page: Pick<PagePreview, 'id' | 'preview' | 'conflict'>;
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

export default function KiwimeriPagesBrowserPlugin({
  id,
  docId,
  docPreview,
  pages
}: KiwimeriPagesBrowserPluginProps): JSX.Element {
  const { t } = useLingui();
  const defaultPreview = t`empty page`;

  const history = useHistory();
  const location = useLocation();
  const folderId = getSearchParams(location.search).folder || ROOT_FOLDER;

  return (
    <>
      <div className="page-browser">
        <IonList className="inner-list">
          <PagePreviewItem
            className="page-item-doc"
            key={docId}
            page={{ id: docId, preview: docPreview }}
            selected={id === docId}
            onClick={() => {
              history.push(GET_DOCUMENT_ROUTE(folderId, docId));
            }}
            defaultVal={defaultPreview}
          />

          {(pages || []).map(page => (
            <PagePreviewItem
              key={page.id}
              page={page}
              selected={id === page.id}
              onClick={pageId => {
                history.push(GET_PAGE_ROUTE(folderId, docId, pageId));
              }}
              defaultVal={defaultPreview}
            />
          ))}
        </IonList>
      </div>
    </>
  );
}
