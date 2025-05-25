import { useState, type JSX } from 'react';

import { IonItem, IonList } from '@ionic/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

import { PagePreview } from '@/collection/collection';
import { useLingui } from '@lingui/react/macro';
import './theme/KiwimeriPagesBrowserPlugin.scss';

interface KiwimeriPagesBrowserPluginProps {
  docId: string;
  pages?: PagePreview[];
}

const PagePreviewItem = ({
  page,
  defaultVal
}: {
  page: PagePreview;
  defaultVal: string;
}) => {
  return (
    <IonItem
      button
      className="page-item"
      onClick={() => {
        console.log('click page', page);
      }}
    >
      {page.preview?.length || 0 > 0 ? page.preview?.length : defaultVal}
    </IonItem>
  );
};

export default function KiwimeriPagesBrowserPlugin({
  docId,
  pages
}: KiwimeriPagesBrowserPluginProps): JSX.Element {
  const { t } = useLingui();
  const defaultPreview = t`empty page`;
  const [editor] = useLexicalComposerContext();
  const [minimize, setMinimize] = useState(false);
  return (
    <>
      <div className="page-browser">
        <IonList className="inner-list">
          {(pages || []).map(page => (
            <PagePreviewItem
              key={page.id}
              page={page}
              defaultVal={defaultPreview}
            />
          ))}
        </IonList>
      </div>
    </>
  );
}
