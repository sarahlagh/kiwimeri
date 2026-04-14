import userSettingsService, { Theme } from '@/db/user-settings.service';
import { useLingui } from '@lingui/react/macro';
import { statsService } from '../stats-service';
import TimeChart from './charts/TimeChart';

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
  const theme = userSettingsService.useTheme();
  const { t } = useLingui();
  const width = 600;
  const height = 360;
  //   const rawData = [
  //     {
  //       date: '2026-04-01',
  //       values: { lastWordCount: 1500, lastCharCount: 56000 }
  //     },
  //     {
  //       date: '2026-04-02',
  //       values: { lastWordCount: 2700 }
  //     },
  //     {
  //       date: '2026-04-05',
  //       values: { lastWordCount: 700, lastCharCount: 32040 }
  //     },
  //     {
  //       date: '2026-04-06',
  //       values: { lastWordCount: 8905, lastCharCount: 20200 }
  //     },
  //     {
  //       date: '2026-04-13',
  //       values: { lastCharCount: 20900 }
  //     }
  //   ] as DataPoint[];

  const stats = statsService.getDataPoints(id);
  console.debug('stats for item', stats);

  return (
    <div className="chart-container">
      <TimeChart
        theme={theme}
        width={width}
        height={height}
        rawData={stats}
        series={[
          {
            key: 'lastWordCount',
            label: t`word count`,
            rgb: COLORS[theme].TIME_SERIE_COLOR
          }
        ]}
      />
    </div>
  );
};

export default ChartContainer;
