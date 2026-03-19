document.addEventListener('DOMContentLoaded', () => {
  const DIGITS = {
    0: [1, 1, 1, 1, 1, 1, 0], 1: [0, 1, 1, 0, 0, 0, 0], 2: [1, 1, 0, 1, 1, 0, 1],
    3: [1, 1, 1, 1, 0, 0, 1], 4: [0, 1, 1, 0, 0, 1, 1], 5: [1, 0, 1, 1, 0, 1, 1],
    6: [1, 0, 1, 1, 1, 1, 1], 7: [1, 1, 1, 0, 0, 0, 0], 8: [1, 1, 1, 1, 1, 1, 1],
    9: [1, 1, 1, 1, 0, 1, 1]
  };
  const SEGS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

  function renderDigit(id, num) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    SEGS.forEach((s, i) => {
      const div = document.createElement('div');
      div.className = `seg seg-${s}${DIGITS[num][i] ? ' on' : ''}`;
      el.appendChild(div);
    });
  }

  renderDigit('d0', 0);
  renderDigit('d1', 1);
  renderDigit('h0', 1);
  renderDigit('h1', 2);
  renderDigit('m0', 3);
  renderDigit('m1', 4);

  const drehteil = document.querySelector('.drehteil');
  if (drehteil) {
    drehteil.addEventListener('click', () => {
      drehteil.classList.toggle('rotated');
      document.body.classList.toggle('dark-mode');
    });
  }

  const powerBtn = document.querySelector('.power-btn');
  if (powerBtn) {
    powerBtn.addEventListener('click', () => {
      alert('System wird heruntergefahren...');
    });
  }

  const hintBtn = document.querySelector('.hint');
  if (hintBtn) {
    hintBtn.addEventListener('click', () => {
      window.scrollBy({
        top: window.innerHeight,
        behavior: 'smooth'
      });
    });
  }
});
