const { MESSAGE_TYPES } = require('./protocol');

function createWebsocketScopes(services) {
  const { pcStatusService, appsService, prometheusService } = services;

  function toSafeObject(payload) {
    if (payload && typeof payload === 'object') return payload;
    return {};
  }

  return {
    status: {
      load: () => pcStatusService.getPayload(),
      toMessage: (payload) => ({ type: MESSAGE_TYPES.STATUS, ...toSafeObject(payload) })
    },
    monitoring: {
      load: () => prometheusService.getOverview('1h', 15),
      toMessage: (payload) => {
        const safePayload = toSafeObject(payload);
        if (safePayload.error) {
          return { type: MESSAGE_TYPES.MONITORING, error: safePayload.error };
        }
        return { type: MESSAGE_TYPES.MONITORING, ...safePayload };
      }
    },
    apps: {
      load: () => appsService.getStatePayload(),
      toMessage: (payload) => toSafeObject(payload)
    }
  };
}

module.exports = { createWebsocketScopes };
