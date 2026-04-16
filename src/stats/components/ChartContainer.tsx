import userSettingsService from '@/db/user-settings.service';
import { IonSelect, IonSelectOption } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import { useEffect, useRef, useState } from 'react';
import { statsService, trackedStats, TrackedStats } from '../stats-service';
import TimeChart from './charts/TimeChart';
import { DataPoint } from './data-point';

import './ChartContainer.scss';

type ChartContainerProps = {
  id: string;
};

const ChartContainer = ({ id }: ChartContainerProps) => {
  const { t } = useLingui();
  const theme = userSettingsService.useTheme();
  const [stats, setStats] = useState<DataPoint[]>();
  const [statKey, setStatKey] = useState<TrackedStats>('lastWordCount');
  const [size, setSize] = useState<{ width: number; height: number }>();

  // attach fake stats to a real item so i can test normalization
  // const fakeStats = buildFake();
  // fakeStats.forEach(dataPoint => {
  //   statsService.updateTodaysStats('3H3jdctpzbhDofVU', {
  //     lastCharCount: dataPoint.values.lastCharCount,
  //     lastWordCount: dataPoint.values.lastWordCount,
  //     updatedAt: new Date(dataPoint.date).getTime()
  //   });
  // });
  useEffect(() => {
    const stats = statsService.getDataPoints(id);
    console.debug('stats for item', id, stats);
    setStats(stats);
  }, [id]);

  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const resizeObserver = new ResizeObserver(() => {
      setSize({ width: el.clientWidth - 10, height: el.clientHeight - 44 });
    });
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [ref.current]);

  const seriesByKey: {
    [key in TrackedStats]: {
      key: string;
      label: string;
      yUnit?: string | undefined;
    };
  } = {
    lastWordCount: {
      key: 'lastWordCount',
      label: t`Word Count`,
      yUnit: t`words`
    },
    lastCharCount: {
      key: 'lastCharCount',
      label: t`Character Count`,
      yUnit: t`characters`
    },
    maxWordCount: {
      key: 'maxWordCount',
      label: t`Word Count (Max)`,
      yUnit: t`words`
    },
    maxCharCount: {
      key: 'maxCharCount',
      label: t`Character Count (Max)`,
      yUnit: t`characters`
    }
  };
  // TODO if too recent, labels not right (4/1)

  return (
    <div className="chart-container" ref={ref}>
      <IonSelect value={statKey} onIonChange={e => setStatKey(e.detail.value)}>
        {trackedStats.map(trackedStat => (
          <IonSelectOption key={trackedStat} value={trackedStat}>
            {seriesByKey[trackedStat].label}
          </IonSelectOption>
        ))}
      </IonSelect>

      {size && (
        <TimeChart
          theme={theme}
          width={size.width}
          height={size.height}
          rawData={stats || []}
          series={[seriesByKey[statKey]]}
        />
      )}
    </div>
  );
};

export default ChartContainer;
