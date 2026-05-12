export function initNuclearSwitch() {
  const root = document.querySelector('.nuclear-switch');
  const guardBtn = root?.querySelector('.nuclear-switch-guard-btn');
  const input = root?.querySelector('.nuclear-switch-input');
  if (!root || !guardBtn || !input) return;

  const collapseDelayMs = 340;

  guardBtn.addEventListener('click', () => {
    if (root.classList.contains('nuclear-switch--guard-open')) return;
    root.classList.add('nuclear-switch--guard-open');
    input.disabled = false;
    guardBtn.setAttribute('aria-expanded', 'true');
  });

  input.addEventListener('change', () => {
    if (!root.classList.contains('nuclear-switch--guard-open')) return;
    window.setTimeout(() => {
      root.classList.remove('nuclear-switch--guard-open');
      input.disabled = true;
      guardBtn.setAttribute('aria-expanded', 'false');
    }, collapseDelayMs);
  });
}
