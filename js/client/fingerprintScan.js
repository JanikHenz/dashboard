const DEFAULT_SCAN_MS = 4000;

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
  const scan = document.querySelector('.fingerprint-scan-space .scan');
  if (!scan) return;

  let scanTimer = null;

  function clearScanTimer() {
    if (scanTimer == null) return;
    window.clearTimeout(scanTimer);
    scanTimer = null;
  }

  function finishScan() {
    clearScanTimer();
    scan.classList.remove('is-scanning');
    window.alert('Fingerabdruck-Scan abgeschlossen.');
  }

  function startScan() {
    if (scan.classList.contains('is-scanning')) return;
    scan.classList.add('is-scanning');
    clearScanTimer();
    const ms = parseScanDurationMs(scan);
    scanTimer = window.setTimeout(finishScan, ms);
  }

  scan.addEventListener('click', startScan);
}
