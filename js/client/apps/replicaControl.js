/** Anzeige fuer fehlende K8s-Werte */
export function displayDash(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export function formatResourcePair(req, lim) {
  return `${displayDash(req)} / ${displayDash(lim)}`;
}

export function parseCpuToMillicores(s) {
  if (s == null || s === '') return 250;
  const str = String(s).trim();
  if (str.endsWith('m')) {
    const n = parseInt(str.slice(0, -1), 10);
    return Number.isNaN(n) ? 250 : Math.max(1, n);
  }
  const n = parseFloat(str);
  if (Number.isNaN(n)) return 250;
  return Math.max(1, Math.round(n * 1000));
}

export function millicoresToCpuString(mc) {
  const n = Number(mc);
  if (!Number.isFinite(n) || n < 1) return '250m';
  if (n >= 1000 && n % 1000 === 0) return String(n / 1000);
  return `${Math.round(n)}m`;
}

export function parseMemoryToMi(s) {
  if (s == null || s === '') return 256;
  const str = String(s).trim();
  const gi = str.match(/^([\d.]+)\s*Gi$/i);
  if (gi) return Math.max(1, Math.round(parseFloat(gi[1]) * 1024));
  const mi = str.match(/^([\d.]+)\s*Mi$/i);
  if (mi) return Math.max(1, Math.round(parseFloat(mi[1])));
  const m = str.match(/^([\d.]+)\s*M$/i);
  if (m) return Math.max(1, Math.round(parseFloat(m[1])));
  return 256;
}

export function miToMemoryString(mi) {
  const n = Math.round(Number(mi));
  if (!Number.isFinite(n) || n < 1) return '256Mi';
  if (n % 1024 === 0 && n >= 1024) return `${n / 1024}Gi`;
  return `${n}Mi`;
}

/**
 * Befuellt ein Replica-Control-Panel (gleiche Klassen wie im Hauptlayout).
 * @param {object} elements title, metaLine, count, countLabel, slider, sliderValue
 * @param {object} config
 */
export function renderResourceReplicaPanel(elements, config) {
  const {
    titleHtml,
    metaLine,
    countText,
    countLabel,
    sliderMin,
    sliderMax,
    sliderStep,
    sliderValue,
    sliderDisabled,
    sliderValueLabel
  } = config;

  if (
    !elements.title
    || !elements.metaLine
    || !elements.count
    || !elements.countLabel
    || !elements.slider
    || !elements.sliderValue
  ) {
    return;
  }

  elements.title.innerHTML = titleHtml;
  elements.metaLine.textContent = metaLine;
  elements.count.textContent = countText;
  elements.countLabel.textContent = countLabel;
  elements.slider.min = String(sliderMin);
  elements.slider.max = String(sliderMax);
  elements.slider.step = String(sliderStep ?? 1);
  elements.slider.value = String(sliderValue);
  elements.slider.disabled = Boolean(sliderDisabled);
  elements.sliderValue.textContent = sliderValueLabel ?? String(sliderValue);
}

export function syncSliderValueLabel(elements, value) {
  if (!elements.slider || !elements.sliderValue) return;
  elements.slider.value = String(value);
  elements.sliderValue.textContent = String(value);
}
