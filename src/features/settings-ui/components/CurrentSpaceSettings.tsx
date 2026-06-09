import { displayOptsService } from '@/domain/collection-display-opts/display-opts.service';
import useSpaceDefaultSort from '@/domain/collection-display-opts/hooks/useSpaceDefaultSort';
import { itemFlagsService } from '@/domain/collection-flags/flags.service';
import useSpaceDefaultFlags from '@/domain/collection-flags/hooks/useSpaceDefaultFlags';
import { statsService } from '@/domain/stats/stats-service';
import usePrefState from '@/domain/user-preferences/hooks/usePrefState';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import GenericCollectionSettings from './GenericCollectionSettings';

const CurrentSpaceSettings = () => {
  const _defaultSort = useSpaceDefaultSort();
  const _defaultFlags = useSpaceDefaultFlags();
  const { t } = useLingui();

  const [maxHistoryPerDoc, setMaxHistoryPerDoc] =
    usePrefState<'maxHistoryPerDoc'>('maxHistoryPerDoc');

  const [historyIdleTime, setHistoryIdleTime] =
    usePrefState<'historyIdleTime'>('historyIdleTime');

  const [historyMaxInterval, setHistoryMaxInterval] =
    usePrefState<'historyMaxInterval'>('historyMaxInterval');

  return (
    <IonCard className="primary">
      <IonCardHeader>
        <IonCardTitle>
          <Trans>Space Settings</Trans>
        </IonCardTitle>
        <IonCardSubtitle>
          <Trans>
            Options for the currently selected space. Some can still be
            overriden per notebook and per folder.
          </Trans>
        </IonCardSubtitle>
      </IonCardHeader>

      <IonCardContent>
        <GenericCollectionSettings
          defaultSort={_defaultSort}
          onDefaultSortChange={newSort => {
            displayOptsService.setSpaceDefaultSort(newSort);
          }}
          defaultFlags={_defaultFlags}
          onDefaultFlagsChange={newFlags => {
            if (newFlags.statsEnabled && !_defaultFlags.statsEnabled) {
              console.log('stats setting enabled on space, backfilling');
              statsService.backfillStats();
              console.log('stats backfilling done');
            }
            itemFlagsService.setSpaceDefaultFlags(newFlags);
          }}
          withRows={[
            {
              key: 'history_idle_time',
              label: t`History idle time (s)`,
              description: t`When working on a document, a new version will be automatically if idle after XX seconds`,
              type: 'number'
            },
            {
              key: 'history_max_interval',
              label: t`History save time (min)`,
              description: t`When working on a document, a new version will be automatically at least every XX minutes`,
              type: 'number'
            },
            {
              key: 'max_history_per_doc',
              label: t`Number of versions`,
              description: t`The number of versions to keep per document. Set 0 for unlimited.`,
              type: 'number'
            }
          ]}
          withInitialState={{
            history_idle_time: historyIdleTime / 1000,
            history_max_interval: historyMaxInterval / 60000,
            max_history_per_doc: maxHistoryPerDoc
          }}
          withOnChange={(key, val) => {
            if (key === 'history_idle_time') {
              setHistoryIdleTime((val as number) * 1000);
            } else if (key === 'history_max_interval') {
              setHistoryMaxInterval((val as number) * 60000);
            } else if (key === 'max_history_per_doc') {
              setMaxHistoryPerDoc(val as number);
            }
          }}
        />
      </IonCardContent>
    </IonCard>
  );
};
export default CurrentSpaceSettings;
