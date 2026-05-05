const DIGITS = {
  0: [1, 1, 1, 1, 1, 1, 0],
  1: [0, 1, 1, 0, 0, 0, 0],
  2: [1, 1, 0, 1, 1, 0, 1],
  3: [1, 1, 1, 1, 0, 0, 1],
  4: [0, 1, 1, 0, 0, 1, 1],
  5: [1, 0, 1, 1, 0, 1, 1],
  6: [1, 0, 1, 1, 1, 1, 1],
  7: [1, 1, 1, 0, 0, 0, 0],
  8: [1, 1, 1, 1, 1, 1, 1],
  9: [1, 1, 1, 1, 0, 1, 1]
};

const SEGMENT_CLASSES = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

function renderDigit(digitId, number) {
  const digitEl = document.getElementById(digitId);
  if (!digitEl) return;

  const pattern = DIGITS[number] || DIGITS[0];
  SEGMENT_CLASSES.forEach((segmentClass, index) => {
    const segment = digitEl.querySelector(`.seg-${segmentClass}`);
    if (segment) {
      segment.classList.toggle('on', Boolean(pattern[index]));
    }
  });
}

function renderPair(prefix, value) {
  const valueString = String(value).padStart(2, '0');
  renderDigit(`${prefix}0`, Number.parseInt(valueString[0], 10));
  renderDigit(`${prefix}1`, Number.parseInt(valueString[1], 10));
}

export function updateTimerDisplay(uptimeMs) {
  if (uptimeMs <= 0) {
    renderPair('d', 0);
    renderPair('h', 0);
    renderPair('m', 0);
    return;
  }

  const totalMins = Math.floor(uptimeMs / 1000 / 60);
  const days = Math.floor(totalMins / (24 * 60));
  const hours = Math.floor((totalMins % (24 * 60)) / 60);
  const mins = totalMins % 60;

  renderPair('d', days);
  renderPair('h', hours);
  renderPair('m', mins);
}
