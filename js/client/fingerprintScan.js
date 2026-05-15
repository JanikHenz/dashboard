const DEFAULT_SCAN_MS = 4000;

/** Nur Spielerei im Frontend, kein echtes Geheimnis. */
const FINGERPRINT_FUN_PASSWORD = 'unernst';

function parseScanDurationMs(scanEl) {
  const raw = getComputedStyle(scanEl).getPropertyValue('--fingerprint-scan-duration').trim();
  if (!raw) return DEFAULT_SCAN_MS;
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return DEFAULT_SCAN_MS;
  if (raw.endsWith('ms')) return Math.round(n);
  if (raw.endsWith('s')) return Math.round(n * 1000);
  return DEFAULT_SCAN_MS;
}

export function initFingerprintScan() {
  const root = document.querySelector('.fingerprint-scan-space');
  const scan = root?.querySelector('.scan');
  const dialog = root?.querySelector('.fingerprint-scan-dialog');
  const form = document.getElementById('fingerprint-scan-auth-form');
  const feedback = document.getElementById('fingerprint-scan-dialog-feedback');
  const closeBtn = document.getElementById('fingerprint-scan-dialog-close');
  const passwordInput = form?.querySelector('input[name="password"]');

  if (!scan || !dialog || !form || !feedback || !passwordInput) return;

  let scanTimer = null;

  function clearScanTimer() {
    if (scanTimer == null) return;
    window.clearTimeout(scanTimer);
    scanTimer = null;
  }

  function resetDialogUi() {
    form.reset();
    feedback.textContent = '';
    feedback.hidden = true;
    passwordInput.removeAttribute('aria-invalid');
  }

  function finishScan() {
    clearScanTimer();
    scan.classList.remove('is-scanning');
    resetDialogUi();
    dialog.showModal();
    window.queueMicrotask(() => passwordInput.focus());
  }

  function startScan() {
    if (scan.classList.contains('is-scanning')) return;
    scan.classList.add('is-scanning');
    clearScanTimer();
    const ms = parseScanDurationMs(scan);
    scanTimer = window.setTimeout(finishScan, ms);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = new FormData(form).get('password');
    const entered = String(raw ?? '').trim();
    if (entered === FINGERPRINT_FUN_PASSWORD) {
      feedback.textContent = 'Stimmt. Willkommen.';
      feedback.hidden = false;
      passwordInput.removeAttribute('aria-invalid');
      window.setTimeout(() => {
        dialog.close();
      }, 700);
      return;
    }
    feedback.textContent = 'Nicht das richtige Passwort.';
    feedback.hidden = false;
    passwordInput.setAttribute('aria-invalid', 'true');
  });

  closeBtn?.addEventListener('click', () => {
    dialog.close();
  });

  dialog.addEventListener('close', () => {
    resetDialogUi();
  });

  scan.addEventListener('click', startScan);
}
