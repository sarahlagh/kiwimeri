import AddTagsButton from '@/common/buttons/AddTagsButton';
import { APPICONS } from '@/constants';
import { IonButton, IonFooter, IonIcon, IonItem } from '@ionic/react';
import { useState } from 'react';
import DocumentInfoCard from './DocumentInfoCard';
import WordCount from './WordCount';

interface DocumentEditorFooterProps {
  docId: string;
  pageId?: string;
}

const DocumentEditorFooter = ({ docId, pageId }: DocumentEditorFooterProps) => {
  const id = pageId ? pageId : docId;
  const [expand, setExpand] = useState(true);
  return (
    <>
      {expand && <DocumentInfoCard id={id} />}
      <IonFooter
        style={{ overflowX: 'auto', flexWrap: 'nowrap', display: 'flex' }}
      >
        <IonItem className="inner-item">
          <IonButton fill="default" onClick={() => setExpand(!expand)}>
            <IonIcon
              icon={expand ? APPICONS.collapse : APPICONS.expand}
            ></IonIcon>
          </IonButton>

          <WordCount id={id} />
          <AddTagsButton id={docId} />
        </IonItem>
      </IonFooter>
    </>
  );
};
export default DocumentEditorFooter;
