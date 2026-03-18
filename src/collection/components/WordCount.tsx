import { APPICONS } from '@/constants';
import { searchAncestryService } from '@/search/search-ancestry.service';
import { IonIcon, IonItem, IonLabel, IonText } from '@ionic/react';
import { Trans } from '@lingui/react/macro';

type WordCountProps = {
  id: string;
};

const WordCount = ({ id }: WordCountProps) => {
  // temp until we store it in model
  const content = searchAncestryService.useItemPreview(id);
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
  const wordCount = content
    ? Array.from(segmenter.segment(content)).filter(seg => seg.isWordLike)
        .length
    : 0;

  return (
    <>
      <IonItem className="inner-item">
        <IonIcon icon={APPICONS.info}></IonIcon>
        <IonText>
          <i>
            &nbsp;
            {wordCount} <Trans>words</Trans>
          </i>
        </IonText>
      </IonItem>
      <IonLabel></IonLabel>
    </>
  );
};

export default WordCount;
