export function initSafetySwitch({ onRequestRefresh } = {}) {
  const root = document.querySelector('.safety-switch');
  const cover = root?.querySelector('.safety-switch-cover');
  const input = root?.querySelector('.safety-switch-input');
  if (!root || !cover || !input) return;

  const collapseDelayMs = 340;
  const autoCloseDelayMs = 5000;
  let isSendingShutdown = false;
  let autoCloseTimer = null;

  function clearAutoCloseTimer() {
    if (!autoCloseTimer) return;
    window.clearTimeout(autoCloseTimer);
    autoCloseTimer = null;
  }

  function closeCover() {
    clearAutoCloseTimer();
    root.classList.remove('safety-switch--cover-open');
    input.disabled = true;
    cover.setAttribute('aria-expanded', 'false');
  }

  function scheduleAutoClose() {
    clearAutoCloseTimer();
    autoCloseTimer = window.setTimeout(() => {
      if (isSendingShutdown) return;
      closeCover();
    }, autoCloseDelayMs);
  }

  function resetSwitch() {
    input.checked = false;
    window.setTimeout(closeCover, collapseDelayMs);
  }

  async function triggerHardShutdown() {
    const confirmed = confirm('Server wirklich hart herunterfahren?');
    if (!confirmed) {
      resetSwitch();
      return;
    }

    isSendingShutdown = true;
    try {
      const response = await fetch('/api/hard-shutdown', { method: 'POST' });
      if (!response.ok) {
        alert('Hard Shutdown konnte nicht ausgelöst werden.');
        resetSwitch();
        return;
      }

      alert('Hard Shutdown wurde ausgelöst.');
      resetSwitch();
      if (typeof onRequestRefresh === 'function') {
        window.setTimeout(onRequestRefresh, 1500);
      }
    } catch (error) {
      console.error('Safety switch shutdown failed:', error);
      alert('Hard Shutdown konnte nicht gesendet werden.');
      resetSwitch();
    } finally {
      isSendingShutdown = false;
    }
  }

  cover.addEventListener('click', () => {
    if (root.classList.contains('safety-switch--cover-open')) {
      closeCover();
      return;
    }
    root.classList.add('safety-switch--cover-open');
    input.disabled = false;
    cover.setAttribute('aria-expanded', 'true');
    scheduleAutoClose();
  });

  input.addEventListener('change', () => {
    if (!root.classList.contains('safety-switch--cover-open')) return;
    if (isSendingShutdown) return;
    clearAutoCloseTimer();
    triggerHardShutdown();
  });
}
