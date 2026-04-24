import { dateToStr } from '@/common/date-utils';
import uPlot, { Series } from 'uplot';

function isDefined(n: number | null | undefined): n is number {
  return n !== null && n !== undefined;
}

type PluginOptions = {
  tooltipColor?: string;
  tooltipBackground?: string;
  yUnits?: string[];
};

export function legendPlugin({
  tooltipColor,
  tooltipBackground,
  yUnits
}: PluginOptions) {
  let ySeries: Series[];
  let tooltipElements: HTMLDivElement[];
  let xMiddle: number;

  function init(u: uPlot, opts: uPlot.Options, data: uPlot.AlignedData) {
    const over = u.over;
    over.style.cursor = 'pointer';

    ySeries = u.series.toSpliced(0, 1); // removes the first, which is the x serie

    // assumes data is already sorted - if becomes a problem, might switch to u.data on setLegend
    const xMin = data[0][0];
    const xMax = data[0][data[0].length - 1];
    xMiddle = (xMax - xMin) / 2 + xMin;

    tooltipElements = ySeries.map(s => {
      const tt = document.createElement('div');
      tt.className = 'custom-tooltip';
      tt.style.pointerEvents = 'none';
      tt.style.position = 'absolute';
      tt.style.color = tooltipColor || 'var(--ion-color-light)';
      tt.style.background = tooltipBackground || 'var(--ion-color-dark)';
      tt.style.display = s.show ? 'block' : 'none';
      over.appendChild(tt);
      return tt;
    });
  }

  function setLegend(u: uPlot) {
    const { idx } = u.cursor;
    if (!isDefined(idx)) {
      // out of the canvas, hide all
      tooltipElements.forEach(tt => {
        tt.style.display = 'none';
      });
      return;
    }

    tooltipElements.forEach((tt, i) => {
      const s = ySeries[i];
      if (!s.show) return;

      const xVal = u.data[0][idx];
      const yVal = u.data[i + 1][idx]; // i + 1 because tooltipElements has 1 element less (the x serie)
      if (!isDefined(yVal) || !s.scale) return;

      const yUnit = yUnits ? yUnits[i] : '';
      tt.innerHTML = `${dateToStr('date-printable', xVal * 1000)} </br> ${yVal} ${yUnit}`;

      // position tooltip to the left or right of the cursor
      const xOffset = xVal <= xMiddle ? 0 : tt.clientWidth;
      tt.style.left = Math.round(u.valToPos(xVal, 'x')) - xOffset + 'px';
      tt.style.top = Math.round(u.valToPos(yVal, s.scale)) + 'px';
      tt.style.display = 'block';
    });
  }

  return {
    hooks: {
      init,
      setLegend
    }
  };
}
