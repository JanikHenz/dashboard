/** Session-Flag nach erfolgreichem Fingerabdruck-Passwort (nur Client, Spielerei). */
export const DETAIL_UNLOCK_SESSION_KEY = 'dashboard-fingerprint-detail-unlock';

export function isDetailPageUnlocked() {
  try {
    return window.sessionStorage.getItem(DETAIL_UNLOCK_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function setDetailPageUnlocked() {
  try {
    window.sessionStorage.setItem(DETAIL_UNLOCK_SESSION_KEY, '1');
  } catch {
    /* z. B. privates Fenster */
  }
}

/** Index der App-Uebersicht, funktioniert mit Modul-Basis-URL und mit `/` als Startseite. */
export function getAppsIndexHref() {
  return new URL('../index.html', import.meta.url).href;
}
