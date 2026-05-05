import { monitoringConfig, monitorHeaderBindings } from './monitoring/config.js';
import { clearHeaderValues, renderHeader } from './monitoring/header.js';
import {
  createBaseChartOption,
  createChartErrorOption
} from './monitoring/chartOptions.js';

export function createMonitoringPanel() {
  const charts = new Map();

  function ensureCharts() {
    if (!window.echarts) return false;
    monitoringConfig.forEach((config) => {
      const target = document.getElementById(config.id);
      if (!target) return;
      if (!charts.has(config.id)) {
        charts.set(config.id, echarts.init(target));
      }
    });
    return charts.size > 0;
  }

  function resizeCharts() {
    requestAnimationFrame(() => {
      charts.forEach((chart) => {
        try {
          chart.resize();
        } catch (_error) {
        }
      });
    });
  }

  function showChartError(message) {
    monitoringConfig.forEach((config) => {
      const chart = charts.get(config.id);
      if (!chart) return;
      chart.clear();
      chart.setOption(createChartErrorOption(config.title, message), true);
    });
  }

  function applyPayload(data) {
    if (!data || typeof data !== 'object') return;
    if (!ensureCharts()) return;
    if (data.error) {
      clearHeaderValues(monitorHeaderBindings, '--');
      const message = typeof data.error === 'string' ? data.error : 'Monitoring nicht erreichbar';
      showChartError(message);
      return;
    }

    const safeData = {
      ...data,
      series: data.series && typeof data.series === 'object' ? data.series : {}
    };

    renderHeader(safeData, monitorHeaderBindings);
    monitoringConfig.forEach((config) => {
      const chart = charts.get(config.id);
      if (!chart) return;
      const points = safeData.series?.[config.key] || [];
      chart.setOption(createBaseChartOption(config, points), true);
    });
    resizeCharts();
  }

  function initResizeObservers() {
    if (!ensureCharts()) return;
    window.addEventListener('resize', resizeCharts);
    const chartsRoot = document.getElementById('charts');
    if (chartsRoot && typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => resizeCharts());
      resizeObserver.observe(chartsRoot);
    }
  }

  return {
    applyPayload,
    resizeCharts,
    initResizeObservers
  };
}
