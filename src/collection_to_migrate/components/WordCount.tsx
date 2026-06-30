import { countWords } from '@/common_to_migrate/utils';
import { SpaceTables } from '@/core/db/store-constants';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import { IonText } from '@ionic/react';
import { Trans } from '@lingui/react/macro';

type WordCountProps = {
  id: string;
};

// temp until we store it in model
const WordCount = ({ id }: WordCountProps) => {
  // probably provide hook somewhere
  const content = useSpaceCell<SpaceTables.DerivedContent, 'plainText'>(
    SpaceTables.DerivedContent,
    id,
    'plainText'
  );
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
