import { SID, SpaceDocContentTables } from '@/core/db/store-constants';
import { useSpaceDocContentCell } from '@/core/db/ui-hooks';
import { countWords } from '@/shared/utils';
import { IonText } from '@ionic/react';
import { Trans } from '@lingui/react/macro';

type WordCountProps = {
  id: string;
};

// temp until we store it in model
const WordCount = ({ id }: WordCountProps) => {
  // probably provide hook somewhere
  const content = useSpaceDocContentCell<
    SpaceDocContentTables.CollectionContent,
    'plainText'
  >(
    SpaceDocContentTables.CollectionContent,
    id,
    'plainText',
    SID.spaceDocContent
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
