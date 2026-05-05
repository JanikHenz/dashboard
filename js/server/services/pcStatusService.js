const ping = require('ping');

function createPcStatusService({ pcIp, prometheusService }) {
  async function getPayload() {
    try {
      const [pingResult, uptimeMs] = await Promise.all([
        ping.promise.probe(pcIp, { timeout: 1 }).catch(() => ({ alive: false })),
        prometheusService.resolvePcUptimeMs().catch(() => 0)
      ]);

      const safeUptimeMs = Number.isFinite(Number(uptimeMs)) ? Number(uptimeMs) : 0;
      const isOn = Boolean(pingResult?.alive) || safeUptimeMs > 0;
      return { is_on: isOn, uptime_ms: safeUptimeMs };
    } catch (_error) {
      return { is_on: false, uptime_ms: 0, error: 'Ping fehlgeschlagen' };
    }
  }

  return { getPayload };
}

module.exports = { createPcStatusService };
