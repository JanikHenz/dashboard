export function initSafetySwitch({ onRequestRefresh } = {}) {
  const root = document.querySelector('.safety-switch');
  const cover = root?.querySelector('.safety-switch-cover');
  const input = root?.querySelector('.safety-switch-input');
  if (!root || !cover || !input) return;

  const collapseDelayMs = 340;
  let isSendingShutdown = false;

  function closeCover() {
    root.classList.remove('safety-switch--cover-open');
    input.disabled = true;
    cover.setAttribute('aria-expanded', 'false');
  }

  function resetSwitch() {
    input.checked = false;
    window.setTimeout(closeCover, collapseDelayMs);
  }

  async function isServerOnline() {
    const response = await fetch('/api/status');
    if (!response.ok) return false;
    const payload = await response.json();
    return payload?.is_on === true;
  }

  async function triggerHardShutdown() {
    const confirmed = confirm('Server wirklich hart herunterfahren?');
    if (!confirmed) {
      resetSwitch();
      return;
    }

    isSendingShutdown = true;
    try {
      const serverOnline = await isServerOnline();
      if (!serverOnline) {
        alert('Der Server ist bereits aus oder nicht erreichbar.');
        resetSwitch();
        return;
      }

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
    if (root.classList.contains('safety-switch--cover-open')) return;
    root.classList.add('safety-switch--cover-open');
    input.disabled = false;
    cover.setAttribute('aria-expanded', 'true');
  });

  input.addEventListener('change', () => {
    if (!root.classList.contains('safety-switch--cover-open')) return;
    if (isSendingShutdown) return;
    triggerHardShutdown();
  });
}
