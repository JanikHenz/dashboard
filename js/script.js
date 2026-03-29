document.addEventListener('DOMContentLoaded', () => {
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

  const segmentClasses = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

  function renderDigit(digitId, number) {
    const digitEl = document.getElementById(digitId);
    if (!digitEl) return;

    const pattern = DIGITS[number] || DIGITS[0];

    segmentClasses.forEach((segClass, index) => {
      const segment = digitEl.querySelector(`.segment.${segClass}`);
      if (segment) {
        if (pattern[index]) {
          segment.classList.add('on');
        } else {
          segment.classList.remove('on');
        }
      }
    });
  }

  function updateTimerDisplay(uptimeMs) {
    if (uptimeMs <= 0) {
      renderDigit('d0', 0); renderDigit('d1', 0);
      renderDigit('h0', 0); renderDigit('h1', 0);
      renderDigit('m0', 0); renderDigit('m1', 0);
      return;
    }

    const totalMins = Math.floor(uptimeMs / 1000 / 60);
    const d = Math.floor(totalMins / (24 * 60));
    const h = Math.floor((totalMins % (24 * 60)) / 60);
    const m = totalMins % 60;

    const dStr = String(d).padStart(2, '0');
    const hStr = String(h).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');

    renderDigit('d0', parseInt(dStr[0]));
    renderDigit('d1', parseInt(dStr[1]));
    renderDigit('h0', parseInt(hStr[0]));
    renderDigit('h1', parseInt(hStr[1]));
    renderDigit('m0', parseInt(mStr[0]));
    renderDigit('m1', parseInt(mStr[1]));
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
        pwrLed.style.backgroundColor = isPcOn ? '#00ff00' : '#ff0000';
        pwrLed.style.boxShadow = isPcOn ? '0 0 10px #00ff00' : 'none';
      }

      updateTimerDisplay(data.uptime_ms);

    } catch (error) {
      console.error('Fehler beim Status-Check:', error);
      if (pwrLed) pwrLed.style.backgroundColor = '#888';
    }
  }

  fetchPcStatus();
  setInterval(fetchPcStatus, 5000);

  if (powerBtn) {
    powerBtn.addEventListener('click', async () => {
      powerBtn.style.transform = 'scale(0.95)';
      setTimeout(() => powerBtn.style.transform = 'scale(1)', 150);

      if (confirm(isPcOn ? "Ubuntu-Server hart ausschalten?" : "Ubuntu-Server einschalten?")) {
        try {
          const response = await fetch('/api/press-button');
          if (response.ok) {
            console.log("Knopf erfolgreich gedrückt!");
            setTimeout(fetchPcStatus, 1500);
          } else {
            alert("Backend-Fehler beim Drücken des Knopfes!");
          }
        } catch (err) {
          console.error("Netzwerkfehler beim Klicken:", err);
          alert("Konnte den Befehl nicht senden.");
        }
      }
    });
  }

  async function loadApps() {
    const grid = document.getElementById('app-grid');
    if (!grid) return;

    try {
      const response = await fetch('/api/apps');
      const apps = await response.json();
      
      grid.innerHTML = ''; 
      
      apps.forEach(app => {
        const link = document.createElement('a');
        link.href = app.url;
        link.target = "_blank"; 
        link.className = "app-item"; 
        
        link.innerHTML = `
          <img src="${app.icon}" alt="${app.name} Icon">
          <span>${app.name}</span>
        `;
        
        grid.appendChild(link);
      });
    } catch (error) {
      console.error('Fehler beim Laden der Apps:', error);
      grid.innerHTML = '<p style="color:red; grid-column: 1 / -1; text-align: center;">Konnte Apps nicht laden.</p>';
    }
  }

  loadApps();
});
