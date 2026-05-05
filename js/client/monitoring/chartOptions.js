import { getCssVar, getPalette } from './style.js';

export function createBaseChartOption(config, points) {
  const palette = getPalette();
  const seriesData = points.map((point) => [point.timestamp, point.value]);
  return {
    animation: false,
    title: {
      text: config.title,
      left: 12,
      top: 8,
      textStyle: {
        color: palette.text,
        fontFamily: 'Patrick Hand, cursive',
        fontSize: 18,
        textBorderColor: palette.stroke,
        textBorderWidth: 1
      }
    },
    grid: { left: 48, right: 14, top: 46, bottom: 26 },
    tooltip: {
      trigger: 'axis',
      appendToBody: true,
      confine: false,
      backgroundColor: 'rgba(30, 38, 48, 0.94)',
      borderColor: '#000000',
      borderWidth: 2,
      padding: [8, 12],
      textStyle: {
        color: '#f5f8fb',
        fontFamily: 'Patrick Hand, cursive',
        fontSize: 14
      },
      valueFormatter: (value) => `${Number(value).toFixed(2)} ${config.unit}`
    },
    xAxis: {
      type: 'time',
      axisLabel: { color: palette.text },
      axisLine: { lineStyle: { color: palette.grid } },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: palette.text,
        formatter: (value) => `${value}${config.unit === '%' ? '%' : ''}`
      },
      axisLine: { lineStyle: { color: palette.grid } },
      splitLine: { lineStyle: { color: palette.grid } }
    },
    series: [{
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 3, color: palette.line },
      areaStyle: { color: palette.area },
      data: seriesData
    }]
  };
}

export function createChartErrorOption(title, message) {
  const palette = getPalette();
  return {
    title: {
      text: title,
      left: 'center',
      top: 'middle',
      textStyle: {
        color: palette.text,
        fontFamily: 'Patrick Hand, cursive',
        textBorderColor: palette.stroke,
        textBorderWidth: 1,
        fontSize: 16
      },
      subtext: message,
      subtextStyle: {
        color: getCssVar('--offline'),
        fontFamily: 'Patrick Hand, cursive',
        fontSize: 14
      }
    }
  };
}
