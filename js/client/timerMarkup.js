const SEGMENT_LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
const TIMER_GROUPS = [
  { prefix: 'd' },
  { prefix: 'h' },
  { prefix: 'm' }
];

function createDigitElement(id) {
  const digit = document.createElement('div');
  digit.className = 'digit';
  digit.id = id;
  SEGMENT_LETTERS.forEach((letter) => {
    const segment = document.createElement('div');
    segment.className = `seg seg-${letter}`;
    digit.appendChild(segment);
  });
  return digit;
}

function createDigitPair(prefix) {
  const digits = document.createElement('div');
  digits.className = 'digits';
  digits.appendChild(createDigitElement(`${prefix}0`));
  digits.appendChild(createDigitElement(`${prefix}1`));
  return digits;
}

function createTimerGroup(prefix) {
  const group = document.createElement('div');
  group.className = 'group';
  group.appendChild(createDigitPair(prefix));
  return group;
}

export function initTimerMarkup(root = document) {
  const segment = root.querySelector('.timer .segment[data-timer-segment]');
  if (!segment || segment.childElementCount > 0) {
    return;
  }

  TIMER_GROUPS.forEach((groupConfig, index) => {
    if (index > 0) {
      const separator = document.createElement('div');
      separator.className = 'separator';
      separator.textContent = ':';
      segment.appendChild(separator);
    }
    segment.appendChild(createTimerGroup(groupConfig.prefix));
  });
}
