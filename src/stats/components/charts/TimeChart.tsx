import { Theme } from '@/db/user-settings.service';
import { useMemo } from 'react';
import { AlignedData } from 'uplot';
import UplotReact from 'uplot-react';
import 'uplot/dist/uPlot.min.css';
import { DataPoint } from '../data-point';
import { legendPlugin } from './legend-plugin';

const defaultRgb = '0,0,255';

type TimeChartOptions = {
  theme?: Theme;
  showGrid?: boolean;
};

type TimeChartProps = {
  width: number;
  height: number;
  rawData: DataPoint[];
  series: { key: string; label: string; rgb?: string }[];
} & TimeChartOptions;

//  (0: top, 1: right, 2: bottom, 3: left)
const UPLOT_LEFT = 3;
const UPLOT_RIGHT = 1;

const COLORS: {
  [key in Theme]: { AXE_COLOR: string; GRID_COLOR: string };
} = {
  light: {
    AXE_COLOR: '#999',
    GRID_COLOR: '#ededed'
  },
  dark: {
    AXE_COLOR: '#999',
    GRID_COLOR: '#232222'
  }
};

const TimeChart = ({
  theme = 'light',
  showGrid = true,
  width,
  height,
  rawData,
  series
}: TimeChartProps) => {
  const { options, data } = useMemo(() => {
    const options: uPlot.Options = {
      width,
      height,
      scales: {
        x: { time: true }
      },
      series: [{}],
      axes: [
        {
          stroke: COLORS[theme].AXE_COLOR,
          grid: {
            stroke: COLORS[theme].GRID_COLOR,
            show: showGrid
          }
        }
      ],
      legend: {
        show: false
      },
      plugins: [legendPlugin()]
    };

    function hasValues(dataPoint: DataPoint) {
      return series.some(s => dataPoint.values[s.key] !== undefined);
    }
    const timestamps = rawData
      .filter(hasValues)
      .map(d => new Date(d.date).getTime() / 1000); // seconds
    const values: number[][] = [];
    series.forEach((serie, i) => {
      const rgb = serie.rgb || defaultRgb;
      values.push(rawData.filter(hasValues).map(d => d.values[serie.key]));
      options.series.push({
        scale: `${i}`,
        label: serie.label,
        stroke: `rgba(${rgb})`,
        fill: `rgba(${rgb},0.1)`
      });
      options.axes!.push({
        scale: `${i}`,
        stroke: COLORS[theme].AXE_COLOR,
        side: i % 2 ? UPLOT_RIGHT : UPLOT_LEFT,
        grid: {
          stroke: COLORS[theme].GRID_COLOR,
          show: showGrid
        }
      });
    });

    const data = [timestamps, ...values];
    return { options, data };
  }, [rawData, series]);

  return <UplotReact data={data as AlignedData} options={options} />;
};

export default TimeChart;
