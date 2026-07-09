import { SID, SpaceContentTables } from '@/core/db/store-constants';
import { useSpaceContentCell } from '@/core/db/tinybase-hooks';
import { getDerivedId } from '@/domain/collection/document-content';
import { countWords } from '@/shared/utils';
import { IonText } from '@ionic/react';
import { Trans } from '@lingui/react/macro';

type WordCountProps = {
  id: string;
};

// temp until we store it in model
const WordCount = ({ id }: WordCountProps) => {
  // probably provide hook somewhere
  const content = useSpaceContentCell<
    SpaceContentTables.DerivedContent,
    'plainText'
  >(
    SpaceContentTables.DerivedContent,
    getDerivedId('c', id),
    'plainText',
    SID.spaceContent
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
