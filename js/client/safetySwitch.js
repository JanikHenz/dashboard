export function initSafetySwitch() {
  const root = document.querySelector('.safety-switch');
  const cover = root?.querySelector('.safety-switch-cover');
  const input = root?.querySelector('.safety-switch-input');
  if (!root || !cover || !input) return;

  const collapseDelayMs = 340;

  cover.addEventListener('click', () => {
    if (root.classList.contains('safety-switch--cover-open')) return;
    root.classList.add('safety-switch--cover-open');
    input.disabled = false;
    cover.setAttribute('aria-expanded', 'true');
  });

  input.addEventListener('change', () => {
    if (!root.classList.contains('safety-switch--cover-open')) return;
    window.setTimeout(() => {
      root.classList.remove('safety-switch--cover-open');
      input.disabled = true;
      cover.setAttribute('aria-expanded', 'false');
    }, collapseDelayMs);
  });
}
