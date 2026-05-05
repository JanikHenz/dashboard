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

export function clearHeaderValues(bindings, placeholder = '--') {
  bindings.forEach((row) => {
    setTextById(row.id, placeholder);
  });
}

export function renderHeader(data, bindings) {
  const series = data.series || {};
  bindings.forEach((row) => {
    const value = latestValue(series[row.key]);
    setTextById(row.id, formatMetric(value, row.unit, row.digits));
  });
}
