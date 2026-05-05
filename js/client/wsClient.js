import { MESSAGE_TYPES, SCOPES } from './protocol.js';

export function createWsClient({ onMessage, onDisconnected }) {
  let socket = null;
  let reconnectTimer = null;
  const safeOnMessage = typeof onMessage === 'function' ? onMessage : () => {};
  const safeOnDisconnected = typeof onDisconnected === 'function' ? onDisconnected : () => {};

  function clearReconnectTimer() {
    if (!reconnectTimer) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  function sendRefresh(scope = SCOPES.STATUS) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const payload = scope === SCOPES.STATUS
      ? { type: MESSAGE_TYPES.REFRESH }
      : { type: MESSAGE_TYPES.REFRESH, scope };
    socket.send(JSON.stringify(payload));
  }

  function connect() {
    clearReconnectTimer();
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${proto}//${location.host}/ws`);

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload && typeof payload === 'object') {
          safeOnMessage(payload);
        }
      } catch (error) {
        console.error('WebSocket parse error:', error);
      }
    };

    socket.onerror = () => {
      safeOnDisconnected();
    };

    socket.onclose = () => {
      socket = null;
      safeOnDisconnected();
      reconnectTimer = setTimeout(connect, 3000);
    };
  }

  return {
    connect,
    sendRefresh
  };
}
