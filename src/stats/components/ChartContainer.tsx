import userSettingsService, { Theme } from '@/db/user-settings.service';
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

const COLORS: {
  [key in Theme]: { TIME_SERIE_COLOR: string };
} = {
  light: {
    TIME_SERIE_COLOR: '0,84,233'
  },
  dark: {
    TIME_SERIE_COLOR: '77,141,255'
  }
};

const ChartContainer = ({ id }: ChartContainerProps) => {
  const { t } = useLingui();
  const theme = userSettingsService.useTheme();
  const [stats, setStats] = useState<DataPoint[]>();
  const [statKey, setStatKey] = useState<TrackedStats>('lastWordCount');
  const [size, setSize] = useState<{ width: number; height: number }>();
  const width = 10;
  const height = 10;

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
      rgb?: string | undefined;
    };
  } = {
    lastWordCount: {
      key: 'lastWordCount',
      label: t`Word Count`,
      rgb: COLORS[theme].TIME_SERIE_COLOR
    },
    lastCharCount: {
      key: 'lastCharCount',
      label: t`Character Count`,
      rgb: COLORS[theme].TIME_SERIE_COLOR
    },
    maxWordCount: {
      key: 'maxWordCount',
      label: t`Word Count (Max)`,
      rgb: COLORS[theme].TIME_SERIE_COLOR
    },
    maxCharCount: {
      key: 'maxCharCount',
      label: t`Character Count (Max)`,
      rgb: COLORS[theme].TIME_SERIE_COLOR
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
