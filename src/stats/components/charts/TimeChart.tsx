import { Theme } from '@/db/user-settings.service';
import { useMemo } from 'react';
import { AlignedData } from 'uplot';
import UplotReact from 'uplot-react';
import 'uplot/dist/uPlot.min.css';
import { DataPoint } from '../data-point';
import { legendPlugin } from './legend-plugin';

type TimeChartOptions = {
  theme?: Theme;
  showGrid?: boolean;
};

type TimeChartProps = {
  width: number;
  height: number;
  rawData: DataPoint[];
  series: { key: string; label: string; yUnit?: string }[];
} & TimeChartOptions;

//  (0: top, 1: right, 2: bottom, 3: left)
const UPLOT_LEFT = 3;
const UPLOT_RIGHT = 1;

const COLORS: {
  [key in Theme]: {
    AXE_COLOR: string;
    GRID_COLOR: string;
    LINE_BASE_RGB: string;
    TOOLTIP_COLOR: string;
    TOOLTIP_BACKGROUND: string;
  };
} = {
  light: {
    AXE_COLOR: '#999',
    GRID_COLOR: '#ededed',
    LINE_BASE_RGB: '0,84,233',
    TOOLTIP_COLOR: 'var(--ion-color-dark)',
    TOOLTIP_BACKGROUND: '#abc6f6'
  },
  dark: {
    AXE_COLOR: '#999',
    GRID_COLOR: '#232222',
    LINE_BASE_RGB: '77,141,255',
    TOOLTIP_COLOR: 'var(--ion-color-dark)',
    TOOLTIP_BACKGROUND: '#1e232d'
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
    const rgb = COLORS[theme].LINE_BASE_RGB;
    const options: uPlot.Options = {
      width,
      height,
      scales: {
        x: { time: true }
      },
      cursor: {
        x: false,
        y: false
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
      plugins: [
        legendPlugin({
          tooltipColor: COLORS[theme].TOOLTIP_COLOR,
          tooltipBackground: COLORS[theme].TOOLTIP_BACKGROUND,
          yUnits: series.map(s => s.yUnit || '')
        })
      ]
    };

    function hasValues(dataPoint: DataPoint) {
      return series.some(s => dataPoint.values[s.key] !== undefined);
    }
    const timestamps = rawData
      .filter(hasValues)
      .map(d => new Date(d.date).getTime() / 1000); // seconds
    const values: number[][] = [];
    series.forEach((serie, i) => {
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
