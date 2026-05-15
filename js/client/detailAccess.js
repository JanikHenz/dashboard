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
  }
}

export function clearDetailPageUnlock() {
  try {
    window.sessionStorage.removeItem(DETAIL_UNLOCK_SESSION_KEY);
  } catch {
  }
}

export function getAppsIndexHref() {
  return new URL('../../index.html', import.meta.url).href;
}
