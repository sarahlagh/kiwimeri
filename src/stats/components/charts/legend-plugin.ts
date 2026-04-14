import { dateToStr } from '@/common/date-utils';

export function legendPlugin() {
  let seriestt;

  function hideTips() {
    seriestt.forEach((tt, i) => {
      if (i == 0) return;
      tt.style.display = 'none';
    });
  }

  function init(u, opts, data) {
    let over = u.over;
    over.style.cursor = 'pointer';

    seriestt = opts.series.map((s, i) => {
      if (i == 0) return;

      let tt = document.createElement('div');
      tt.className = 'tooltip';
      tt.textContent = 'Tooltip!';
      tt.style.pointerEvents = 'none';
      tt.style.position = 'absolute';
      tt.style.background = 'rgba(0,0,0,0.1)';
      tt.style.color = s.color;
      over.appendChild(tt);
      return tt;
    });

    function showTips() {
      // cursortt.style.display = null;
      seriestt.forEach((tt, i) => {
        if (i == 0) return;

        let s = u.series[i];
        tt.style.display = s.show ? null : 'none';
      });
    }

    over.addEventListener('click', () => {
      // console.debug('click');
      // showTips()
    });
    showTips();
  }

  function setLegend(u) {
    const { idx } = u.cursor;
    if (idx === null) {
      hideTips();
      return;
    }

    // can optimize further by not applying styles if idx did not change
    seriestt.forEach((tt, i) => {
      if (i == 0) return;

      let s = u.series[i];

      if (s.show) {
        const xVal = u.data[0][idx];
        const yVal = u.data[i][idx];

        tt.innerHTML = `${dateToStr('date-printable', xVal * 1000)} </br> ${yVal}`;

        tt.style.left = Math.round(u.valToPos(xVal, 'x')) + 'px';
        tt.style.top = Math.round(u.valToPos(yVal, s.scale)) + 'px';
        tt.style.display = null;
      }
    });
  }

  return {
    hooks: {
      init,
      setLegend
    }
  };
}
