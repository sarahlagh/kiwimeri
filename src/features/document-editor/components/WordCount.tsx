import { SID, SpaceArchiveTables } from '@/core/db/store-constants';
import { useSpaceArchiveCell } from '@/core/db/tinybase-hooks';
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
  const content = useSpaceArchiveCell<
    SpaceArchiveTables.DerivedContent,
    'plainText'
  >(
    SpaceArchiveTables.DerivedContent,
    getDerivedId('c', id),
    'plainText',
    SID.spaceArchive
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
