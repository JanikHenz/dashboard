export function getCssVar(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

export function getPalette() {
  return {
    text: getCssVar('--text-accent'),
    stroke: getCssVar('--text-stroke-color') || getCssVar('--comic-blue-very-dark'),
    grid: getCssVar('--chart-grid'),
    line: getCssVar('--lcd-on'),
    area: getCssVar('--on'),
    tooltipBackground: getCssVar('--chart-tooltip-bg'),
    tooltipText: getCssVar('--chart-tooltip-text')
  };
}
