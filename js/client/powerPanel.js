export function createPowerPanel({ onRequestRefresh, updateTimerDisplay }) {
  const powerBtn = document.querySelector('.power-btn');
  const pwrLed = document.querySelector('.pwr-led');
  let isPcOn = false;
  let wasOn = false;
  let wasPressed = false;

  function setLedPending() {
    if (!pwrLed) return;
    pwrLed.style.backgroundColor = 'var(--pending)';
    pwrLed.style.boxShadow = '0 0 6px var(--pending), 0 0 14px var(--pending)';
  }

  function setLedStatus(isOnline) {
    if (!pwrLed) return;
    const color = isOnline ? 'var(--online)' : 'var(--offline)';
    pwrLed.style.backgroundColor = color;
    pwrLed.style.boxShadow = `0 0 6px ${color}, 0 0 14px ${color}`;
  }

  function setLedDisconnected() {
    if (!pwrLed) return;
    pwrLed.style.backgroundColor = '#888';
  }

  async function handlePowerClick() {
    if (!powerBtn) return;
    powerBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
      powerBtn.style.transform = 'scale(1)';
    }, 150);

    const action = isPcOn ? 'Force shutdown Ubuntu server?' : 'Power on Ubuntu server?';
    if (!confirm(action)) return;

    try {
      wasOn = isPcOn;
      const response = await fetch('/api/press-button');
      if (!response.ok) {
        wasPressed = false;
        alert('Backend error!');
        return;
      }
      wasPressed = true;
      if (pwrLed) pwrLed.style.backgroundColor = '#FFA500';
      setTimeout(onRequestRefresh, 1500);
    } catch (error) {
      console.error('Network error:', error);
      wasPressed = false;
      alert('Could not send command.');
    }
  }

  function applyStatus(data) {
    if (data.is_on === undefined) return;

    isPcOn = data.is_on;
    if (wasPressed && isPcOn === wasOn) {
      setLedPending();
    } else {
      wasPressed = false;
      setLedStatus(isPcOn);
    }

    const uptime = Number(data.uptime_ms);
    updateTimerDisplay(Number.isFinite(uptime) ? uptime : 0);
  }

  if (powerBtn) {
    powerBtn.addEventListener('click', handlePowerClick);
  }

  return {
    applyStatus,
    setDisconnected: setLedDisconnected
  };
}
