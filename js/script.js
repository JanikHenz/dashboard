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


  const hintBtn = document.querySelector('.hint');
  if (hintBtn) {
    hintBtn.addEventListener('click', () => {
      window.scrollBy({
        top: window.innerHeight,
        behavior: 'smooth'
      });
    });
  }

  const powerBtn = document.querySelector('.power-btn');
  const pwrLed = document.querySelector('.pwr-led');
  let isPcOn = false;

  async function fetchPcStatus() {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      isPcOn = data.is_on;
      
      if (pwrLed) {
        if (isPcOn) {
          pwrLed.style.backgroundColor = '#00ff00';
          pwrLed.style.boxShadow = '0 0 10px #00ff00';
        } else {
          pwrLed.style.backgroundColor = '#ff0000';
          pwrLed.style.boxShadow = 'none';
        }
      }
    } catch (error) {
      console.error('Fehler beim Status-Check:', error);
      if(pwrLed) pwrLed.style.backgroundColor = '#888';
    }
  }

  fetchPcStatus();
  setInterval(fetchPcStatus, 5000);

  if (powerBtn) {
    powerBtn.addEventListener('click', async () => {
      const aktionText = isPcOn ? 'ausschalten' : 'einschalten';
      if (!confirm(`Möchtest du den PC wirklich ${aktionText}?`)) return;
      
      powerBtn.style.opacity = '0.5';

      try {
        await fetch('/api/press-button');
        setTimeout(fetchPcStatus, 2000);
      } catch (error) {
        alert('Fehler beim Senden des Befehls.');
      } finally {
        powerBtn.style.opacity = '1';
      }
    });
  }
});
