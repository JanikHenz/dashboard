import { updateTimerDisplay } from './client/timerDisplay.js';
import { createPowerPanel } from './client/powerPanel.js';
import { createAppsPanel } from './client/appsPanel.js';
import { createMonitoringPanel } from './client/monitoringPanel.js';
import { createThemeSwitcher } from './client/themeSwitcher.js';
import { createPageSwitcher } from './client/pageSwitcher.js';
import { createWsClient } from './client/wsClient.js';
import { MESSAGE_TYPES, SCOPES } from './client/protocol.js';
import { initSafetySwitch } from './client/safetySwitch.js';
import { initFingerprintScan } from './client/fingerprintScan.js';
import { clearDetailPageUnlock } from './client/detailAccess.js';
import { initTimerMarkup } from './client/timerMarkup.js';

document.addEventListener('DOMContentLoaded', () => {
  initTimerMarkup();
  clearDetailPageUnlock();
  const monitoringPanel = createMonitoringPanel();
  let wsClient = null;
  const sendRefresh = (scope) => {
    if (wsClient) {
      wsClient.sendRefresh(scope);
    }
  };
  initSafetySwitch({ onRequestRefresh: () => sendRefresh(SCOPES.STATUS) });
  initFingerprintScan();
  const appsPanel = createAppsPanel();
  const powerPanel = createPowerPanel({
    onRequestRefresh: () => sendRefresh(SCOPES.STATUS),
    updateTimerDisplay
  });

  createThemeSwitcher({
    onThemeChanged: () => {
      monitoringPanel.reapplyTheme();
      sendRefresh(SCOPES.MONITORING);
    }
  });

  createPageSwitcher({
    onResizeMonitoring: () => monitoringPanel.resizeCharts()
  });

  monitoringPanel.initResizeObservers();

  function handleSocketMessage(data) {
    if (!data || typeof data !== 'object') return;
    if (data.type === MESSAGE_TYPES.STATUS || data.is_on !== undefined) {
      powerPanel.applyStatus(data);
      return;
    }
    if (data.type === MESSAGE_TYPES.MONITORING) {
      monitoringPanel.applyPayload(data);
      return;
    }
    if (data.type === MESSAGE_TYPES.APPS_STATE) {
      appsPanel.applyAppsState(data);
    }
  }

  wsClient = createWsClient({
    onMessage: handleSocketMessage,
    onDisconnected: () => {
      powerPanel.setDisconnected();
    }
  });

  wsClient.connect();
});
