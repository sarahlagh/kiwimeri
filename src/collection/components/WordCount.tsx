import { countWords } from '@/common/utils';
import { searchAncestryService } from '@/search/search-ancestry.service';
import { IonText } from '@ionic/react';
import { Trans } from '@lingui/react/macro';

type WordCountProps = {
  id: string;
};

const WordCount = ({ id }: WordCountProps) => {
  // temp until we store it in model
  const content = searchAncestryService.useItemPreview(id);
  const wordCount = content ? countWords(content) : 0;

  return (
    <>
      <IonText>
        <i>
          &nbsp;
          {wordCount} <Trans>words</Trans>
        </i>
      </IonText>
    </>
  );
};

export default WordCount;
