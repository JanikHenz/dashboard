function latestValue(points) {
  if (!Array.isArray(points) || points.length === 0) return null;
  const value = Number(points[points.length - 1]?.value);
  return Number.isFinite(value) ? value : null;
}

function formatMetric(value, unit, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  const formatted = Number(value).toFixed(digits);
  return unit ? `${formatted} ${unit}` : formatted;
}

function setTextById(elementId, text) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = text;
}

function clampPercent(value) {
  if (!Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, value));
}

function renderCpuGauge(series) {
  const cpuValue = latestValue(series.cpu);
  const gaugeValue = clampPercent(cpuValue);
  const needleAngle = gaugeValue === null ? -130 : -130 + gaugeValue * 2.6;
  const gauge = document.getElementById('cpu-gauge');
  const gaugeLabel = document.getElementById('cpu-gauge-value');
  if (gauge) {
    gauge.style.setProperty('--gauge-value', gaugeValue === null ? 0 : gaugeValue.toFixed(1));
    gauge.style.setProperty('--needle-angle', `${needleAngle.toFixed(1)}deg`);
  }
  if (gaugeLabel) {
    gaugeLabel.textContent = gaugeValue === null ? '--%' : `${Math.round(gaugeValue)}%`;
  }
}

export function clearHeaderValues(bindings, placeholder = '--') {
  bindings.forEach((row) => {
    setTextById(row.id, placeholder);
  });
  renderCpuGauge({});
}

export function renderHeader(data, bindings) {
  const series = data.series || {};
  bindings.forEach((row) => {
    const value = latestValue(series[row.key]);
    setTextById(row.id, formatMetric(value, row.unit, row.digits));
  });
  renderCpuGauge(series);
}
