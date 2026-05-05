export function getCssVar(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

export function getPalette() {
  return {
    text: getCssVar('--text-accent'),
    stroke: getCssVar('--text-stroke-color') || '#000',
    grid: 'rgba(0, 0, 0, 0.25)',
    line: getCssVar('--lcd-on'),
    area: getCssVar('--on')
  };
}
