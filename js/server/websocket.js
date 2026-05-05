const { WebSocketServer } = require('ws');
const { createWebsocketScopes } = require('./websocketScopes');
const { MESSAGE_TYPES, SCOPES } = require('./protocol');

function createDashboardWebSocket(server, services) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const scopes = createWebsocketScopes(services);
  const refreshableScopes = new Set([SCOPES.STATUS, SCOPES.MONITORING, SCOPES.APPS]);

  function wsSendJson(ws, obj) {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(obj));
    }
  }

  async function sendScopeToClient(ws, scopeName) {
    const scope = scopes[scopeName];
    if (!scope) return;
    const payload = await scope.load();
    wsSendJson(ws, scope.toMessage(payload));
  }

  async function broadcastScope(scopeName) {
    const scope = scopes[scopeName];
    if (!scope) return;
    const payload = await scope.load();
    const message = JSON.stringify(scope.toMessage(payload));
    wss.clients.forEach((client) => {
      if (client.readyState === 1) client.send(message);
    });
  }

  function runSilently(task) {
    task().catch(() => {});
  }

  function broadcastStatus() {
    runSilently(() => broadcastScope('status'));
  }

  function broadcastMonitoring() {
    runSilently(() => broadcastScope('monitoring'));
  }

  function broadcastAppsState() {
    runSilently(() => broadcastScope('apps'));
  }

  function handleRefresh(ws, msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === MESSAGE_TYPES.REQUEST_STATUS) {
      runSilently(() => sendScopeToClient(ws, SCOPES.STATUS));
      return;
    }

    if (msg.type !== MESSAGE_TYPES.REFRESH) return;

    const scope = msg.scope || SCOPES.STATUS;
    if (scope === SCOPES.ALL) {
      refreshableScopes.forEach((scopeName) => {
        runSilently(() => sendScopeToClient(ws, scopeName));
      });
      return;
    }

    if (!refreshableScopes.has(scope)) return;
    runSilently(() => sendScopeToClient(ws, scope));
  }

  wss.on('connection', (ws) => {
    runSilently(() => sendScopeToClient(ws, SCOPES.STATUS));
    runSilently(() => sendScopeToClient(ws, SCOPES.MONITORING));
    runSilently(() => sendScopeToClient(ws, SCOPES.APPS));

    ws.on('message', (raw) => {
      let msg = null;
      try {
        msg = JSON.parse(raw.toString());
      } catch (_error) {
        return;
      }
      handleRefresh(ws, msg);
    });
  });

  return {
    broadcastStatus,
    broadcastMonitoring,
    broadcastAppsState
  };
}

module.exports = { createDashboardWebSocket };
